"""GPIO helpers for driving alarms or other actuators."""

from __future__ import annotations

import logging
import threading
import time
from typing import Optional

from .config import AlarmSettings

LOGGER = logging.getLogger(__name__)

try:  # pragma: no cover - hardware specific
    from gpiozero import OutputDevice  # type: ignore import-not-found
except ImportError:  # pragma: no cover - allow running without hardware libs
    OutputDevice = None  # type: ignore
    LOGGER.debug("gpiozero not available; alarm controller will operate in mock mode.")


class AlarmController:
    """Manage an alarm relay connected to a GPIO pin."""

    def __init__(self, settings: AlarmSettings) -> None:
        self._settings = settings
        self._device: Optional[OutputDevice] = None
        self._lock = threading.Lock()
        self._active = False
        self._last_trigger = 0.0

        if not settings.enabled:
            LOGGER.info("Alarm controller disabled via configuration.")
            return

        if OutputDevice is None:
            LOGGER.warning(
                "gpiozero not installed; alarm control disabled. Install gpiozero to enable"
                " physical alarm output."
            )
            self._settings.enabled = False
            return

        try:  # pragma: no cover - hardware specific
            self._device = OutputDevice(settings.pin, active_high=settings.active_high)
            LOGGER.info("Alarm controller initialised on GPIO pin %s.", settings.pin)
        except Exception as exc:  # pragma: no cover - hardware specific
            LOGGER.exception("Failed to initialise GPIO alarm on pin %s: %s", settings.pin, exc)
            self._settings.enabled = False

    @property
    def is_enabled(self) -> bool:
        return self._settings.enabled and self._device is not None

    @property
    def is_active(self) -> bool:
        return self._active

    def activate(self) -> None:
        if not self.is_enabled:
            LOGGER.debug("Alarm activation requested but controller is disabled.")
            return

        with self._lock:
            if self._active:
                return
            self._device.on()  # type: ignore[call-arg]  # pragma: no cover - hardware specific
            self._active = True
            LOGGER.info("Alarm activated on GPIO %s.", self._settings.pin)

    def deactivate(self) -> None:
        if not self.is_enabled:
            return
        with self._lock:
            if not self._active:
                return
            self._device.off()  # type: ignore[call-arg]  # pragma: no cover - hardware specific
            self._active = False
            LOGGER.info("Alarm deactivated on GPIO %s.", self._settings.pin)

    def trigger(self, duration: Optional[float] = None) -> None:
        """Pulse the alarm for a fixed duration respecting cooldown."""

        if not self.is_enabled:
            LOGGER.debug("Skipping alarm trigger; controller disabled.")
            return

        now = time.time()
        cooldown = self._settings.cooldown_seconds
        if cooldown > 0 and (now - self._last_trigger) < cooldown:
            LOGGER.debug("Skipping alarm trigger due to cooldown (%.2fs).", cooldown)
            return

        self._last_trigger = now
        pulse_duration = duration or self._settings.duration_seconds

        def _pulse() -> None:
            try:
                self.activate()
                time.sleep(max(0.1, pulse_duration))
            finally:
                self.deactivate()

        threading.Thread(target=_pulse, daemon=True).start()

    def shutdown(self) -> None:
        """Release GPIO resources."""

        if self._device is not None:
            try:  # pragma: no cover - hardware specific
                self._device.close()
            except Exception as exc:
                LOGGER.warning("Failed to close GPIO device cleanly: %s", exc)
            finally:
                self._device = None
        LOGGER.info("Alarm controller shut down.")


__all__ = ["AlarmController"]

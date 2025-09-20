"""Camera abstractions for Raspberry Pi hardware and development mocks."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Optional

import numpy as np

from .config import CameraSettings

LOGGER = logging.getLogger(__name__)


@dataclass
class CameraStatus:
    """Runtime details about the camera controller."""

    available: bool
    using_mock: bool
    width: int
    height: int
    fps: int


class CameraController:
    """Interface for interacting with the Raspberry Pi camera module."""

    def __init__(self, settings: CameraSettings) -> None:
        self._settings = settings
        self._camera: Optional["Picamera2"] = None
        self._using_mock = settings.use_mock
        self._fallback_to_mock = settings.fallback_to_mock_on_error

    def initialize(self) -> None:
        """Initialise the camera if hardware access is required."""

        if self._using_mock:
            LOGGER.info("Camera controller configured to use mock frames.")
            return

        try:
            from picamera2 import Picamera2  # type: ignore import-not-found
        except ImportError as exc:  # pragma: no cover - hardware specific
            if self._fallback_to_mock:
                LOGGER.warning(
                    "picamera2 not available; falling back to mock camera: %s", exc
                )
                self._using_mock = True
                return
            raise RuntimeError(
                "picamera2 library unavailable and mock fallback disabled"
            ) from exc

        LOGGER.info("Initialising Raspberry Pi camera using picamera2.")
        try:
            camera = Picamera2()
            config = camera.create_still_configuration(
                main={"size": (self._settings.width, self._settings.height)},
                buffer_count=1,
            )
            camera.configure(config)
            camera.start()
            time.sleep(self._settings.warmup_seconds)
        except Exception as exc:  # pragma: no cover - hardware specific
            camera = None
            if self._fallback_to_mock:
                LOGGER.warning(
                    "Camera initialisation failed; using mock frames instead: %s", exc
                )
                self._using_mock = True
                return
            raise RuntimeError("Failed to initialise camera") from exc

        self._camera = camera
        LOGGER.info(
            "Camera initialised at %sx%s @ %sfps.",
            self._settings.width,
            self._settings.height,
            self._settings.fps,
        )

    def shutdown(self) -> None:
        """Release camera resources."""

        if self._camera is not None:
            try:  # pragma: no cover - hardware specific
                self._camera.stop()
                self._camera.close()
            except Exception as exc:  # pragma: no cover - hardware specific
                LOGGER.warning("Failed to gracefully close camera: %s", exc)
            finally:
                self._camera = None
        LOGGER.info("Camera controller shut down.")

    def capture_frame(self) -> np.ndarray:
        """Capture a single RGB frame from the camera or mock source."""

        if not self._using_mock and self._camera is None:
            LOGGER.debug("Camera not initialised; attempting automatic start.")
            self.initialize()

        if self._using_mock:
            return self._generate_mock_frame()

        if self._camera is None:  # pragma: no cover - guard for mypy
            raise RuntimeError("Camera not initialised.")

        frame = self._camera.capture_array("main")  # pragma: no cover - hardware specific
        return frame

    def get_status(self) -> CameraStatus:
        """Return current controller status."""

        return CameraStatus(
            available=self._camera is not None or self._using_mock,
            using_mock=self._using_mock,
            width=self._settings.width,
            height=self._settings.height,
            fps=self._settings.fps,
        )

    def _generate_mock_frame(self) -> np.ndarray:
        """Generate a synthetic frame for development environments."""

        if self._settings.mock_frame_color == "white":
            value = 255
        elif self._settings.mock_frame_color == "gray":
            value = 127
        else:
            value = 0

        frame = np.full(
            (self._settings.height, self._settings.width, 3),
            fill_value=value,
            dtype=np.uint8,
        )
        return frame


__all__ = ["CameraController", "CameraStatus"]

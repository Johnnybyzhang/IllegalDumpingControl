"""Detection pipeline for orchestrating downstream actions."""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Optional

import httpx

from .config import BackendSettings, DetectionSettings, EdgeSettings, LocationSettings
from .gpio import AlarmController
from .models import InferenceResponse

LOGGER = logging.getLogger(__name__)


class DetectionPipeline:
    """Coordinate local alarms and backend notifications for detections."""

    def __init__(
        self,
        settings: EdgeSettings,
        alarm: AlarmController,
    ) -> None:
        self._alarm = alarm
        self._backend = settings.backend
        self._detection = settings.detection
        self._location = settings.location
        self._device_id = settings.device_id
        self._session_lock = threading.Lock()
        self._last_backend_trigger = 0.0

    def process_detection(
        self,
        response: InferenceResponse,
        *,
        encoded_image: Optional[str],
        capture_from_camera: bool,
    ) -> None:
        """Evaluate detections and fire downstream actions if required."""

        if not response.detections:
            LOGGER.debug("No detections returned; skipping pipeline actions.")
            return

        highest_detection = max(response.detections, key=lambda box: box.confidence)
        if highest_detection.confidence < self._detection.min_confidence:
            LOGGER.debug(
                "Highest detection below confidence threshold %.2f (got %.2f).",
                self._detection.min_confidence,
                highest_detection.confidence,
            )
            return

        if self._detection.target_labels:
            allowed = {label.lower() for label in self._detection.target_labels}
            if highest_detection.label.lower() not in allowed:
                LOGGER.debug(
                    "Detection label '%s' not in target set %s; skipping pipeline.",
                    highest_detection.label,
                    allowed,
                )
                return

        LOGGER.info(
            "Triggering pipeline for detection '%s' (confidence %.2f, %s boxes).",
            highest_detection.label,
            highest_detection.confidence,
            len(response.detections),
        )

        # Local alarm first
        self._alarm.trigger()

        # Push to backend if configured
        if self._backend.event_url:
            self._maybe_post_backend(response, encoded_image, capture_from_camera)

    def _maybe_post_backend(
        self,
        response: InferenceResponse,
        encoded_image: Optional[str],
        capture_from_camera: bool,
    ) -> None:
        now = time.time()
        cooldown = self._detection.cooldown_seconds
        with self._session_lock:
            if cooldown > 0 and (now - self._last_backend_trigger) < cooldown:
                LOGGER.debug("Skipping backend notification due to cooldown (%.2fs).", cooldown)
                return
            self._last_backend_trigger = now

        threading.Thread(
            target=self._post_backend,
            args=(response, encoded_image, capture_from_camera),
            daemon=True,
        ).start()

    def _post_backend(
        self,
        response: InferenceResponse,
        encoded_image: Optional[str],
        capture_from_camera: bool,
    ) -> None:
        highest_conf = max((box.confidence for box in response.detections), default=0.0)

        payload = {
            "location_id": self._location.id,
            "event_type": "illegal_dumping",
            "coordinates": {
                "lat": self._location.latitude,
                "lng": self._location.longitude,
            },
            "confidence_score": highest_conf,
            "image_url": None,
            "video_url": None,
            "metadata": {
                "device_id": self._device_id,
                "capture_from_camera": capture_from_camera,
                "detections": [box.model_dump() for box in response.detections],
                "inference": response.metadata.model_dump(exclude_none=True),
                "encoded_image": encoded_image[:131072] if encoded_image else None,
            },
        }

        headers = {
            "Content-Type": "application/json",
            "x-device-id": self._device_id,
        }
        if self._backend.api_key:
            headers["Authorization"] = f"Bearer {self._backend.api_key}"

        try:
            with httpx.Client(timeout=self._backend.timeout_seconds) as client:
                res = client.post(self._backend.event_url, headers=headers, content=json.dumps(payload))
                res.raise_for_status()
            LOGGER.info(
                "Posted detection to backend %s (status %s).",
                self._backend.event_url,
                res.status_code,
            )
        except Exception as exc:  # pragma: no cover - network operations
            LOGGER.warning("Failed to post detection to backend: %s", exc)


__all__ = ["DetectionPipeline"]

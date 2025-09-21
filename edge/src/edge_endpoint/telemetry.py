"""Utilities for publishing inference telemetry to external services."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from .config import SupabaseSettings
from .models import InferenceResponse

LOGGER = logging.getLogger(__name__)


class SupabaseReporter:
    """Publish inference events to a Supabase REST endpoint."""

    def __init__(self, settings: SupabaseSettings, *, device_id: str) -> None:
        self._settings = settings
        self._device_id = device_id
        self._base_url = (settings.rest_url or "").rstrip("/")
        self._timeout = settings.timeout_seconds

    def publish_inference(
        self,
        response: InferenceResponse,
        *,
        source: str,
        capture_from_camera: bool,
    ) -> None:
        """Send an inference record to Supabase if configuration is available."""

        if not self._settings.enabled:
            return

        if not (self._base_url and self._settings.api_key):
            LOGGER.debug(
                "Supabase reporter enabled but rest_url/api_key missing; skipping push."
            )
            return

        url = f"{self._base_url}/rest/v1/{self._settings.table}"
        headers = {
            "apikey": self._settings.api_key,
            "Authorization": f"Bearer {self._settings.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        payload = [
            {
                "device_id": self._device_id,
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "source": source,
                "capture_from_camera": capture_from_camera,
                "detection_count": len(response.detections),
                "detections": [box.model_dump() for box in response.detections],
                "metadata": response.metadata.model_dump(exclude_none=True),
                "encoded_image": response.encoded_image,
            }
        ]

        try:
            with httpx.Client(timeout=self._timeout) as client:
                res = client.post(url, headers=headers, content=json.dumps(payload))
            res.raise_for_status()
        except Exception as exc:  # pragma: no cover - depends on network
            LOGGER.warning("Failed to publish inference telemetry to Supabase: %s", exc)

    def close(self) -> None:
        """Placeholder for interface symmetry (kept for future resources)."""

        # httpx client is short-lived per request; method kept for compatibility.
        return


__all__ = ["SupabaseReporter"]

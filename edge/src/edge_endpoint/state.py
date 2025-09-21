"""Shared application state for FastAPI dependencies."""

from __future__ import annotations

from dataclasses import dataclass

from typing import Optional

from .camera import CameraController
from .config import EdgeSettings
from .gpio import AlarmController
from .inference import YOLODetector
from .pipeline import DetectionPipeline
from .telemetry import SupabaseReporter


@dataclass
class AppState:
    """Container for long-lived application components."""

    settings: EdgeSettings
    camera: CameraController
    detector: YOLODetector
    alarm: AlarmController
    reporter: Optional[SupabaseReporter] = None
    pipeline: Optional[DetectionPipeline] = None


__all__ = ["AppState"]

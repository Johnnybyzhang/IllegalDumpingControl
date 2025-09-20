"""Shared application state for FastAPI dependencies."""

from __future__ import annotations

from dataclasses import dataclass

from .camera import CameraController
from .config import EdgeSettings
from .inference import YOLODetector


@dataclass
class AppState:
    """Container for long-lived application components."""

    settings: EdgeSettings
    camera: CameraController
    detector: YOLODetector


__all__ = ["AppState"]

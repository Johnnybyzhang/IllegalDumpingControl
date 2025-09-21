"""FastAPI dependency helpers for accessing shared components."""

from __future__ import annotations

from fastapi import Depends, Request

from .camera import CameraController
from .gpio import AlarmController
from .inference import YOLODetector
from .state import AppState


def get_app_state(request: Request) -> AppState:
    """Return the shared application state stored on the FastAPI app."""

    state = getattr(request.app.state, "app_state", None)
    if state is None:  # pragma: no cover - guard clause for misconfiguration
        raise RuntimeError("Application state not initialised.")
    return state


def get_camera_controller(state: AppState = Depends(get_app_state)) -> CameraController:
    """Dependency that yields the shared camera controller."""

    return state.camera


def get_detector(state: AppState = Depends(get_app_state)) -> YOLODetector:
    """Dependency that yields the YOLO detector."""

    return state.detector


def get_alarm_controller(state: AppState = Depends(get_app_state)) -> AlarmController:
    """Dependency that yields the GPIO alarm controller."""

    return state.alarm


__all__ = [
    "get_app_state",
    "get_camera_controller",
    "get_detector",
    "get_alarm_controller",
]

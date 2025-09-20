"""Configuration models for the edge inference endpoint."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class CameraSettings(BaseModel):
    """Configuration for the Raspberry Pi camera interface."""

    width: int = Field(1280, description="Capture width in pixels.")
    height: int = Field(720, description="Capture height in pixels.")
    fps: int = Field(30, description="Target frames per second for capture.")
    warmup_seconds: float = Field(
        2.0,
        description=(
            "Seconds to wait after initializing the camera before capturing frames. "
            "Allows auto-exposure to settle."
        ),
    )
    use_mock: bool = Field(
        False,
        description="Force usage of the mock camera regardless of hardware availability.",
    )
    fallback_to_mock_on_error: bool = Field(
        True,
        description=(
            "If true, automatically fall back to the mock camera when hardware initial"
            "isation fails."
        ),
    )
    mock_frame_color: Literal["black", "white", "gray"] = Field(
        "black",
        description="Fill colour used when returning frames from the mock camera.",
    )


class ModelSettings(BaseModel):
    """Configuration for the YOLO model runtime."""

    path: str = Field(
        "models/yolo-v11n.pt",
        description="Filesystem path to the YOLO v11n weights file.",
    )
    confidence_threshold: float = Field(
        0.25,
        ge=0.0,
        le=1.0,
        description="Placeholder confidence threshold to apply during inference.",
    )
    iou_threshold: float = Field(
        0.45,
        ge=0.0,
        le=1.0,
        description="Placeholder IoU threshold for non-max suppression.",
    )
    autoload: bool = Field(
        False,
        description="Load the model during service startup instead of lazily on demand.",
    )


class EdgeSettings(BaseSettings):
    """Top-level service configuration."""

    model_config = SettingsConfigDict(env_prefix="EDGE_", env_nested_delimiter="__")

    host: str = Field(
        "0.0.0.0", description="Bind address for the FastAPI application."
    )
    port: int = Field(8000, description="TCP port for the FastAPI application.")
    autostart_camera: bool = Field(
        False,
        description="Initialize the Raspberry Pi camera during application startup.",
    )
    camera: CameraSettings = Field(default_factory=CameraSettings)
    model: ModelSettings = Field(default_factory=ModelSettings)


@lru_cache
def get_settings() -> EdgeSettings:
    """Return cached edge settings instance."""

    return EdgeSettings()


__all__ = [
    "CameraSettings",
    "ModelSettings",
    "EdgeSettings",
    "get_settings",
]

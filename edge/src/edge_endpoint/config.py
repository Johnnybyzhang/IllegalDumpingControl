"""Configuration models for the edge inference endpoint."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal, Optional

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


class SupabaseSettings(BaseModel):
    """Configuration for optionally publishing inference events to Supabase."""

    enabled: bool = Field(
        False, description="Enable publishing inference results to Supabase REST API."
    )
    rest_url: str | None = Field(
        None,
        description=(
            "Base Supabase project URL (e.g. https://xyzcompany.supabase.co)."
        ),
    )
    table: str = Field(
        "edge_inference_events",
        description="Table name (under /rest/v1) that stores inference telemetry.",
    )
    api_key: str | None = Field(
        None,
        description="Supabase service role key or anon key with insert permissions.",
    )
    timeout_seconds: float = Field(
        5.0, description="HTTP timeout applied when publishing to Supabase."
    )


class BackendSettings(BaseModel):
    """Configuration for forwarding detections to the backend API."""

    event_url: Optional[str] = Field(
        None,
        description=(
            "HTTP endpoint that accepts detection payloads (e.g. Next.js hardware events" \
            " route)."
        ),
    )
    api_key: Optional[str] = Field(
        None,
        description="Optional API key included in `Authorization: Bearer` header.",
    )
    timeout_seconds: float = Field(5.0, description="Timeout for backend HTTP calls.")


class LocationSettings(BaseModel):
    """Metadata describing the physical deployment location."""

    id: str = Field("EDGE-LOCATION-001", description="External identifier for this site.")
    name: str = Field("Raspberry Pi Surveillance Node", description="Human readable name.")
    latitude: float = Field(0.0, description="Latitude for event payloads.")
    longitude: float = Field(0.0, description="Longitude for event payloads.")


class AlarmSettings(BaseModel):
    """GPIO configuration for the audible/visual alarm."""

    enabled: bool = Field(True, description="Enable GPIO control for the alarm relay.")
    pin: int = Field(17, description="BCM GPIO pin connected to the alarm relay.")
    active_high: bool = Field(True, description="Whether a HIGH signal activates the alarm.")
    duration_seconds: float = Field(3.0, description="Default activation duration when triggered.")
    cooldown_seconds: float = Field(5.0, description="Minimum seconds between activations.")


class DetectionSettings(BaseModel):
    """Thresholds governing when detections fire downstream actions."""

    min_confidence: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Minimum confidence required before a detection triggers the pipeline.",
    )
    target_labels: list[str] = Field(
        default_factory=list,
        description=(
            "Optional list of class labels that count as illegal dumping. Leave empty to"
            " accept all detections."
        ),
    )
    cooldown_seconds: float = Field(
        15.0,
        description="Minimum seconds between backend notifications for consecutive detections.",
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
    device_id: str = Field(
        "edge-raspi-01",
        description=(
            "Identifier reported alongside inference events. Override per device via"
            " EDGE_DEVICE_ID."
        ),
    )
    camera: CameraSettings = Field(default_factory=CameraSettings)
    model: ModelSettings = Field(default_factory=ModelSettings)
    supabase: SupabaseSettings = Field(default_factory=SupabaseSettings)
    backend: BackendSettings = Field(default_factory=BackendSettings)
    location: LocationSettings = Field(default_factory=LocationSettings)
    alarm: AlarmSettings = Field(default_factory=AlarmSettings)
    detection: DetectionSettings = Field(default_factory=DetectionSettings)


@lru_cache
def get_settings() -> EdgeSettings:
    """Return cached edge settings instance."""

    return EdgeSettings()


__all__ = [
    "CameraSettings",
    "ModelSettings",
    "SupabaseSettings",
    "BackendSettings",
    "LocationSettings",
    "AlarmSettings",
    "DetectionSettings",
    "EdgeSettings",
    "get_settings",
]

"""Pydantic models used by the edge inference API."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Basic bounding box description."""

    label: str = Field(..., description="Predicted class label.")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score for the detection.",
    )
    x_min: int = Field(..., ge=0, description="Minimum X coordinate of the box.")
    y_min: int = Field(..., ge=0, description="Minimum Y coordinate of the box.")
    x_max: int = Field(..., ge=0, description="Maximum X coordinate of the box.")
    y_max: int = Field(..., ge=0, description="Maximum Y coordinate of the box.")


class InferenceMetadata(BaseModel):
    """Metadata collected during inference."""

    model_path: Optional[str] = Field(
        None, description="Filesystem path to the model used during inference."
    )
    inference_ms: Optional[float] = Field(
        None, description="Total inference time in milliseconds."
    )
    note: Optional[str] = Field(None, description="Placeholder note for scaffold responses.")


class InferenceResponse(BaseModel):
    """Response payload returned by the inference endpoint."""

    detections: list[BoundingBox] = Field(
        default_factory=list, description="Collection of bounding boxes returned by YOLO."
    )
    metadata: InferenceMetadata = Field(
        default_factory=InferenceMetadata,
        description="Additional metadata describing the inference execution.",
    )
    encoded_image: Optional[str] = Field(
        None,
        description=(
            "Optional base64 encoded representation of the processed frame when"
            " requested by the caller."
        ),
    )


class InferenceRequest(BaseModel):
    """Request body for invoking inference."""

    capture_from_camera: bool = Field(
        True,
        description=(
            "When true, capture a fresh frame from the Raspberry Pi camera. If false"
            " an `image_base64` payload must be provided."
        ),
    )
    image_base64: Optional[str] = Field(
        None,
        description="Base64 encoded RGB image to analyse when not capturing from the camera.",
    )
    return_image: bool = Field(
        False,
        description="When true, the response will include the processed frame encoded as base64.",
    )


class ModelStatus(BaseModel):
    """Runtime details about the YOLO model."""

    loaded: bool
    path: str
    autoload: bool


class ModelLoadResponse(BaseModel):
    """Response schema for manual model loading requests."""

    success: bool
    message: str


class CameraStatusPayload(BaseModel):
    """Serializable representation of :class:`CameraStatus`."""

    available: bool
    using_mock: bool
    width: int
    height: int
    fps: int


class HealthStatus(BaseModel):
    """Response returned by the health endpoint."""

    status: Literal["ok", "degraded"]
    camera: CameraStatusPayload
    model: ModelStatus


__all__ = [
    "BoundingBox",
    "InferenceMetadata",
    "InferenceRequest",
    "InferenceResponse",
    "ModelStatus",
    "ModelLoadResponse",
    "CameraStatusPayload",
    "HealthStatus",
]

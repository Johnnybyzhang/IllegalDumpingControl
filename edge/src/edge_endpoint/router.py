"""API routes for the edge inference service."""

from __future__ import annotations

import base64
from dataclasses import asdict
from io import BytesIO

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from .camera import CameraController
from .dependencies import get_app_state, get_camera_controller, get_detector
from .inference import ModelLoadResult, YOLODetector
from .models import (
    CameraStatusPayload,
    HealthStatus,
    InferenceRequest,
    InferenceResponse,
    ModelLoadResponse,
    ModelStatus,
)
from .state import AppState

router = APIRouter()


@router.get("/healthz", response_model=HealthStatus)
async def health_check(state: AppState = Depends(get_app_state)) -> HealthStatus:
    """Report on camera and model readiness."""

    camera_status = state.camera.get_status()
    detector = state.detector
    model_status = ModelStatus(
        loaded=detector.is_loaded,
        path=state.settings.model.path,
        autoload=state.settings.model.autoload,
    )

    service_status = "ok"
    if not camera_status.available or (
        state.settings.model.autoload and not detector.is_loaded
    ):
        service_status = "degraded"

    return HealthStatus(
        status=service_status,
        camera=CameraStatusPayload(**asdict(camera_status)),
        model=model_status,
    )


@router.post("/model/load", response_model=ModelLoadResponse)
async def load_model(detector: YOLODetector = Depends(get_detector)) -> ModelLoadResponse:
    """Trigger model loading and return the outcome."""

    result: ModelLoadResult = await run_in_threadpool(detector.load_model)
    return ModelLoadResponse(success=result.success, message=result.message)


@router.post(
    "/inference",
    response_model=InferenceResponse,
    status_code=status.HTTP_200_OK,
)
async def run_inference(
    request: InferenceRequest,
    detector: YOLODetector = Depends(get_detector),
    camera: CameraController = Depends(get_camera_controller),
) -> InferenceResponse:
    """Execute YOLO inference using either a captured or provided frame."""

    frame = await _resolve_frame(request, camera)
    response = await run_in_threadpool(
        detector.predict, frame, return_image=request.return_image
    )
    return response


async def _resolve_frame(
    request: InferenceRequest, camera: CameraController
) -> np.ndarray:
    """Determine the frame source based on the request payload."""

    if request.capture_from_camera:
        frame = await run_in_threadpool(camera.capture_frame)
        return frame

    if not request.image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_base64 payload required when capture_from_camera is false.",
        )

    return _decode_base64_image(request.image_base64)


def _decode_base64_image(data: str) -> np.ndarray:
    """Decode a base64 encoded RGB image into a NumPy array."""

    try:
        raw = base64.b64decode(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 payload: {exc}",
        ) from exc

    try:
        with Image.open(BytesIO(raw)) as image:
            return np.array(image.convert("RGB"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to decode image: {exc}",
        ) from exc


__all__ = ["router"]

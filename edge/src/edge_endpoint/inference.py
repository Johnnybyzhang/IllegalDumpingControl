"""YOLO model integration scaffolding for the edge endpoint."""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass
from io import BytesIO
from typing import Any, Optional

import numpy as np
from PIL import Image

from .config import ModelSettings
from .models import BoundingBox, InferenceMetadata, InferenceResponse

LOGGER = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    from ultralytics import YOLO  # type: ignore import-not-found
except ImportError:  # pragma: no cover - optional dependency
    YOLO = None  # type: ignore[assignment]
    LOGGER.debug("ultralytics not installed; detector will operate in stub mode.")


@dataclass
class ModelLoadResult:
    """Outcome of attempting to load the YOLO model."""

    success: bool
    message: str


class YOLODetector:
    """Thin wrapper around the YOLO runtime with sensible defaults."""

    def __init__(self, settings: ModelSettings) -> None:
        self._settings = settings
        self._model: Optional["YOLO"] = None
        self._model_info: Optional[str] = None

    @property
    def is_loaded(self) -> bool:
        """Return whether a YOLO model has been successfully loaded."""

        return self._model is not None

    def load_model(self) -> ModelLoadResult:
        """Attempt to load the YOLO weights into memory."""

        if self._model is not None:
            return ModelLoadResult(True, "Model already loaded.")

        if YOLO is None:
            message = (
                "ultralytics not installed. Install the package to enable YOLO v11n"
                " inference."
            )
            LOGGER.warning(message)
            return ModelLoadResult(False, message)

        try:
            self._model = YOLO(self._settings.path)
            self._model_info = getattr(self._model, "model", None)
            LOGGER.info("Loaded YOLO model from %s", self._settings.path)
            return ModelLoadResult(True, "Model loaded successfully.")
        except Exception as exc:  # pragma: no cover - depends on runtime
            message = f"Failed to load YOLO model: {exc}"
            LOGGER.exception(message)
            return ModelLoadResult(False, message)

    def predict(self, frame: np.ndarray, *, return_image: bool = False) -> InferenceResponse:
        """Execute inference on the supplied frame."""

        start = time.perf_counter()
        detections: list[BoundingBox] = []
        note = None

        if self._model is None:
            note = (
                "YOLO model has not been loaded. This is an expected response while the"
                " scaffold is waiting for the v11n weights."
            )
            LOGGER.debug("Returning scaffold inference response: model not loaded.")
        else:
            try:  # pragma: no cover - depends on ultralytics behaviour
                results = self._model(
                    frame,
                    verbose=False,
                    conf=self._settings.confidence_threshold,
                    iou=self._settings.iou_threshold,
                )
                raw_predictions = results[0]
                detections = self._convert_predictions(raw_predictions)
            except Exception as exc:
                note = f"Inference failed: {exc}"
                LOGGER.exception("YOLO inference failed: %s", exc)

        elapsed_ms = (time.perf_counter() - start) * 1000
        metadata = InferenceMetadata(
            model_path=self._settings.path,
            inference_ms=elapsed_ms,
            note=note,
        )

        encoded_image: Optional[str] = None
        if return_image:
            encoded_image = self._encode_image(frame)

        return InferenceResponse(
            detections=detections,
            metadata=metadata,
            encoded_image=encoded_image,
        )

    def _encode_image(self, frame: np.ndarray) -> str:
        """Encode a NumPy frame as base64 PNG."""

        image = Image.fromarray(frame.astype(np.uint8))
        with BytesIO() as buffer:
            image.save(buffer, format="PNG")
            return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def _convert_predictions(self, predictions: Any) -> list[BoundingBox]:
        """Convert YOLO predictions into bounding boxes.

        This method uses attribute access that matches the ``ultralytics`` package
        as of YOLO v8/v9. It is expected that YOLO v11 will follow a similar API. If
        the structure changes, update this method accordingly.
        """

        boxes: list[BoundingBox] = []
        try:  # pragma: no cover - depends on ultralytics
            for box in predictions.boxes:
                xyxy = box.xyxy[0].tolist()
                boxes.append(
                    BoundingBox(
                        label=str(box.cls.cpu().item())
                        if hasattr(box, "cls")
                        else "unknown",
                        confidence=float(box.conf.cpu().item())
                        if hasattr(box, "conf")
                        else 0.0,
                        x_min=int(xyxy[0]),
                        y_min=int(xyxy[1]),
                        x_max=int(xyxy[2]),
                        y_max=int(xyxy[3]),
                    )
                )
        except Exception as exc:
            LOGGER.exception("Failed to convert YOLO predictions: %s", exc)

        return boxes


__all__ = ["YOLODetector", "ModelLoadResult"]

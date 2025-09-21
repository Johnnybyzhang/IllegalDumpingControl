"""YOLO model integration scaffolding for the edge endpoint."""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
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
        self._weights_path: Path = Path(settings.path).expanduser()
        self._class_map: dict[int, str] = {}

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

        weights_path = Path(self._settings.path).expanduser()
        self._weights_path = weights_path

        if not weights_path.exists():
            message = f"Model weights not found at {weights_path}"
            LOGGER.error(message)
            return ModelLoadResult(False, message)

        try:
            self._model = YOLO(str(weights_path))
            names = getattr(self._model, "names", None)
            if isinstance(names, dict):
                self._class_map = {int(k): str(v) for k, v in names.items()}
            elif isinstance(names, (list, tuple)):
                self._class_map = {
                    int(idx): str(label) for idx, label in enumerate(names)
                }
            else:
                self._class_map = {}

            model_info = getattr(self._model, "model", None)
            self._model_info = str(model_info) if model_info is not None else None
            LOGGER.info("Loaded YOLO model from %s", weights_path)
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
            load_result = self.load_model()
            if not load_result.success:
                note = load_result.message
                LOGGER.debug("Returning inference stub: %s", load_result.message)

        if self._model is not None:
            if frame.dtype != np.uint8:
                frame = frame.astype(np.uint8)
            frame = np.ascontiguousarray(frame)

            try:  # pragma: no cover - depends on ultralytics behaviour
                results = self._model.predict(
                    frame,
                    verbose=False,
                    conf=self._settings.confidence_threshold,
                    iou=self._settings.iou_threshold,
                )
                if not results:
                    LOGGER.debug("YOLO returned no results for the provided frame.")
                else:
                    raw_predictions = results[0]
                    detections = self._convert_predictions(raw_predictions)
            except Exception as exc:
                note = f"Inference failed: {exc}"
                LOGGER.exception("YOLO inference failed: %s", exc)

        elapsed_ms = (time.perf_counter() - start) * 1000
        metadata = InferenceMetadata(
            model_path=str(self._weights_path),
            model_info=self._model_info,
            detection_count=len(detections),
            inference_ms=elapsed_ms,
            note=note,
        )

        encoded_image: Optional[str] = None
        if return_image:
            encoded_image = self.encode_frame(frame)

        return InferenceResponse(
            detections=detections,
            metadata=metadata,
            encoded_image=encoded_image,
        )

    def encode_frame(self, frame: np.ndarray) -> str:
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
            yolo_boxes = getattr(predictions, "boxes", None)
            if yolo_boxes is None:
                LOGGER.debug("YOLO predictions missing 'boxes' attribute.")
                return boxes

            if hasattr(yolo_boxes, "cpu"):
                yolo_boxes = yolo_boxes.cpu()

            xyxy_list = yolo_boxes.xyxy if hasattr(yolo_boxes, "xyxy") else None
            cls_list = yolo_boxes.cls if hasattr(yolo_boxes, "cls") else None
            conf_list = yolo_boxes.conf if hasattr(yolo_boxes, "conf") else None

            length = len(xyxy_list) if xyxy_list is not None else len(yolo_boxes)

            for idx in range(length):
                if xyxy_list is not None:
                    xyxy = xyxy_list[idx].tolist()
                else:
                    xyxy = []

                class_label = "unknown"
                if cls_list is not None:
                    try:
                        class_id = int(cls_list[idx].item())
                    except AttributeError:
                        class_id = int(cls_list[idx])
                    class_label = self._class_map.get(class_id, str(class_id))

                confidence = 0.0
                if conf_list is not None:
                    try:
                        confidence = float(conf_list[idx].item())
                    except AttributeError:
                        confidence = float(conf_list[idx])

                if len(xyxy) >= 4:
                    x_min, y_min, x_max, y_max = xyxy[:4]
                else:
                    x_min = y_min = x_max = y_max = 0

                boxes.append(
                    BoundingBox(
                        label=class_label,
                        confidence=confidence,
                        x_min=int(round(x_min)),
                        y_min=int(round(y_min)),
                        x_max=int(round(x_max)),
                        y_max=int(round(y_max)),
                    )
                )
        except Exception as exc:
            LOGGER.exception("Failed to convert YOLO predictions: %s", exc)

        return boxes


__all__ = ["YOLODetector", "ModelLoadResult"]

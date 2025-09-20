"""Application factory for the edge inference API."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

from .camera import CameraController
from .config import get_settings
from .inference import YOLODetector
from .router import router
from .state import AppState

LOGGER = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = get_settings()
    app = FastAPI(
        title="Illegal Dumping Edge Inference API",
        version="0.1.0",
        description=(
            "Edge endpoint scaffold for running YOLO v11n inference on a Raspberry Pi 5."
        ),
    )

    camera = CameraController(settings.camera)
    detector = YOLODetector(settings.model)
    app.state.app_state = AppState(settings=settings, camera=camera, detector=detector)

    app.include_router(router)

    @app.on_event("startup")
    async def startup_event() -> None:
        LOGGER.info("Starting edge inference service.")

        if settings.autostart_camera:
            LOGGER.info("Autostarting Raspberry Pi camera controller.")
            await run_in_threadpool(camera.initialize)

        if settings.model.autoload:
            LOGGER.info("Autoloading YOLO model from %s", settings.model.path)
            await run_in_threadpool(detector.load_model)

    @app.on_event("shutdown")
    async def shutdown_event() -> None:
        LOGGER.info("Shutting down edge inference service.")
        await run_in_threadpool(camera.shutdown)

    return app


app = create_app()


__all__ = ["app", "create_app"]

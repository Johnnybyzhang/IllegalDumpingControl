"""Entrypoint for running the edge inference API with ``python -m``."""

from __future__ import annotations

import logging

import uvicorn

from .config import get_settings

LOGGER = logging.getLogger(__name__)


def main() -> None:
    """Start a Uvicorn server hosting the FastAPI application."""

    settings = get_settings()
    LOGGER.info("Launching edge inference API on %s:%s", settings.host, settings.port)
    uvicorn.run("edge_endpoint.main:app", host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()

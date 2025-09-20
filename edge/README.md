# Edge Inference Endpoint Scaffold

This directory contains a lightweight FastAPI service intended to run on a Raspberry Pi 5 Model B with the original Raspberry Pi Camera Module v1.3. The service exposes an HTTP endpoint that will eventually execute YOLO v11n inference locally. The current implementation focuses on scaffolding the project structure so future model integration can happen with minimal friction.

## Features

- FastAPI application with a minimal router, ready to expose health and inference endpoints.
- Dependency configuration for camera access and YOLO model handling, with clear extension points for future logic.
- Sensible defaults for Raspberry Pi deployments (host, port, camera resolution, warmup times) that are overridable through environment variables.
- Mock fallbacks for camera and model access to support development on non-Pi hardware.

## Project Structure

```
edge/
├── README.md
├── requirements.txt
├── src/
│   └── edge_endpoint/
│       ├── __init__.py
│       ├── __main__.py
│       ├── camera.py
│       ├── config.py
│       ├── dependencies.py
│       ├── inference.py
│       ├── main.py
│       ├── models.py
│       ├── router.py
│       └── state.py
└── tests/
    └── __init__.py  # placeholder for future test suite
```

## Getting Started

1. **Install system dependencies (Raspberry Pi):**
   ```bash
   sudo apt update
   sudo apt install -y python3-pip python3-venv libatlas-base-dev libjpeg-dev
   ```

2. **Create a Python virtual environment:**
   ```bash
   cd /path/to/IllegalDumpingControl/edge
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Run the service:**
   ```bash
   # Default host/port can be overridden via EDGE_HOST / EDGE_PORT
   python -m edge_endpoint
   ```

The API will expose a health check at `http://<pi-host>:8000/healthz` and a placeholder inference endpoint at `http://<pi-host>:8000/inference`.

### API Endpoints

- `GET /healthz` – Returns camera and model readiness details.
- `POST /model/load` – Manually trigger model loading once the YOLO weights are available.
- `POST /inference` – Capture a frame or process a provided base64 image and return placeholder detection output.

## Environment Variables

Environment variables use the `EDGE_` prefix. Nested settings use double underscores (`__`). Example variables:

- `EDGE_HOST` / `EDGE_PORT` – Override the bind address (defaults: `0.0.0.0:8000`).
- `EDGE_AUTOSTART_CAMERA` – Set to `true` to initialize the camera on startup.
- `EDGE_AUTOLOAD_MODEL` – Set to `true` to load the YOLO model during startup.
- `EDGE_CAMERA__WIDTH` / `EDGE_CAMERA__HEIGHT` – Camera resolution in pixels (defaults: `1280x720`).
- `EDGE_CAMERA__USE_MOCK` – Set to `true` to force the mock camera even when hardware drivers are available.
- `EDGE_CAMERA__FALLBACK_TO_MOCK_ON_ERROR` – When `true` (default), the service will switch to mock frames automatically if camera initialisation fails.
- `EDGE_MODEL__PATH` – Filesystem path to the YOLO v11n model weights (default: `models/yolo-v11n.pt`).
- `EDGE_MODEL__CONFIDENCE_THRESHOLD` – Placeholder confidence threshold for inference (default: `0.25`).

## Next Steps

- Integrate the actual YOLO v11n weights once available and update `YOLODetector.load_model` and `YOLODetector.predict`.
- Extend the inference response schema with detections and metadata aligned with the cloud backend expectations.
- Implement frame streaming or MQTT hooks if live monitoring is required.
- Add automated tests under `edge/tests/` to validate camera mocks and inference workflow.

## Optional Dependencies

The scaffold avoids heavy dependencies by default. When you are ready to integrate the model, install the YOLO runtime (for example, `ultralytics` when YOLO v11 becomes available) and update `requirements.txt` or create a separate `requirements-model.txt`.

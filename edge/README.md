# Edge Inference Endpoint Scaffold

This directory contains a lightweight FastAPI service intended to run on a Raspberry Pi 5 Model B with the original Raspberry Pi Camera Module v1.3. The service now ships with a ready-to-run YOLO v11 inference pipeline and optional Supabase telemetry so detections can be synchronised with the cloud backend.

## Features

- FastAPI application that exposes health and inference endpoints tuned for Raspberry Pi hardware.
- YOLO v11 weights (`models/yolo-v11n.pt`) bundled locally with automatic loading and bounding-box decoding.
- Optional Supabase reporting pipeline that batches inference payloads to a REST table for downstream processing.
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

   > **Note:** The `ultralytics` dependency brings in PyTorch. On Raspberry Pi OS bookworm (64-bit) you may prefer to install the prebuilt PyTorch wheel first, e.g. `pip install torch --index-url https://download.pytorch.org/whl/cpu`. Afterwards rerun `pip install -r requirements.txt`.

4. **Run the service:**
   ```bash
   # Default host/port can be overridden via EDGE_HOST / EDGE_PORT
   python -m edge_endpoint
   ```

The API will expose a health check at `http://<pi-host>:8000/healthz` and a placeholder inference endpoint at `http://<pi-host>:8000/inference`.

### API Endpoints

- `GET /healthz` – Returns camera and model readiness details.
- `POST /model/load` – Manually trigger model loading once the YOLO weights are available.
- `POST /inference` – Capture a frame or process a provided base64 image, return YOLO detections, and queue telemetry for Supabase if configured.

## Environment Variables

Environment variables use the `EDGE_` prefix. Nested settings use double underscores (`__`). Example variables:

- `EDGE_HOST` / `EDGE_PORT` – Override the bind address (defaults: `0.0.0.0:8000`).
- `EDGE_AUTOSTART_CAMERA` – Set to `true` to initialize the camera on startup.
- `EDGE_AUTOLOAD_MODEL` – Set to `true` to load the YOLO model during startup.
- `EDGE_CAMERA__WIDTH` / `EDGE_CAMERA__HEIGHT` – Camera resolution in pixels (defaults: `1280x720`).
- `EDGE_CAMERA__USE_MOCK` – Set to `true` to force the mock camera even when hardware drivers are available.
- `EDGE_CAMERA__FALLBACK_TO_MOCK_ON_ERROR` – When `true` (default), the service will switch to mock frames automatically if camera initialisation fails.
- `EDGE_MODEL__PATH` – Filesystem path to the YOLO v11 weights (default: `models/yolo-v11n.pt`).
- `EDGE_MODEL__CONFIDENCE_THRESHOLD` – Placeholder confidence threshold for inference (default: `0.25`).
- `EDGE_DEVICE_ID` – Identifier reported alongside telemetry payloads (default: `edge-raspi-01`).
- `EDGE_SUPABASE__ENABLED` – Set to `true` to publish inference telemetry to Supabase.
- `EDGE_SUPABASE__REST_URL` – Base Supabase project URL (e.g. `https://your-project.supabase.co`).
- `EDGE_SUPABASE__TABLE` – REST table that receives inference payloads (default: `edge_inference_events`).
- `EDGE_SUPABASE__API_KEY` – Supabase API key with insert access (use the provided burner key for staging).
- `EDGE_BACKEND__EVENT_URL` – Optional HTTP endpoint for reporting detections to the cloud stack (e.g. `http://127.0.0.1:3000/api/hardware/events`).
- `EDGE_LOCATION__ID` / `EDGE_LOCATION__NAME` / `EDGE_LOCATION__LATITUDE` / `EDGE_LOCATION__LONGITUDE` – Metadata describing the deployment site.
- `EDGE_ALARM__ENABLED` – Enable GPIO alarm control (default: `true`).
- `EDGE_ALARM__PIN` – BCM pin connected to the alarm relay (default: `17`).
- `EDGE_ALARM__DURATION_SECONDS` – Pulse duration when triggering the alarm (default: `3`).
- `EDGE_ALARM__COOLDOWN_SECONDS` – Cooldown window to avoid repeated pulses (default: `5`).
- `EDGE_DETECTION__MIN_CONFIDENCE` – Minimum detection confidence to trigger downstream actions (default: `0.5`).
- `EDGE_DETECTION__TARGET_LABELS` – Comma separated labels that should trigger the pipeline (leave blank to accept all detections).
- `EDGE_DETECTION__COOLDOWN_SECONDS` – Cooldown between backend notifications (default: `15`).

## Next Steps

- Implement frame streaming or MQTT hooks if live monitoring is required.
- Add automated tests under `edge/tests/` to validate camera mocks and inference workflow.

## Supabase Telemetry (optional)

Populate the following variables to upload inferences to Supabase using the provided burner key:

```bash
export EDGE_SUPABASE__ENABLED=true
export EDGE_SUPABASE__REST_URL="https://<project-ref>.supabase.co"
export EDGE_SUPABASE__API_KEY="sb_secret_MOT7oFWX_pQOhkhNgvD6zw_v20_ZGtZ"
export EDGE_SUPABASE__TABLE="edge_inference_events"
export EDGE_DEVICE_ID="raspi-10-203-29-238"
```

The reporter inserts JSON payloads via `POST {REST_URL}/rest/v1/{TABLE}` with `apikey`/`Authorization` headers. Ensure the table has `jsonb` columns for `detections`, `metadata`, and optionally `encoded_image`.

## Deploying to the Raspberry Pi

Assuming SSH key-based access to `10.203.29.238` is configured, copy the edge service and model weights from the repo root:

```bash
scp -r edge models  pi@10.203.29.238:~/illegal-dumping-edge
```

Then SSH into the Pi, install dependencies, and launch the service:

```bash
ssh pi@10.203.29.238
cd ~/illegal-dumping-edge/edge
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
EDGE_MODEL__AUTOLOAD=true EDGE_SUPABASE__ENABLED=true python -m edge_endpoint
```

Adjust environment variables to match the deployment (device ID, Supabase URL, host/port). For long-running deployments create a `systemd` unit that runs the command on boot.

## Optional Dependencies

The bundled requirements target CPU inference. For GPU acceleration, install the Raspberry Pi-compatible CUDA or OpenCL stack alongside the matching PyTorch wheels, or experiment with `onnxruntime-gpu`/`tensorrt` builds if the hardware supports them.

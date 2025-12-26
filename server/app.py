from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import threading
import os

from server.hue import HueController, HueConfig
from server.audio import AudioController
from server.experience import LightSoundExperience

import atexit
import signal

app = Flask(__name__)
CORS(app)

VISITORS = []
LOCK = threading.Lock()

# ----------------------------
# Paths (serve UI + assets from Flask)
# ----------------------------
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEMO_ROOT = os.path.join(REPO_ROOT, "demos")
HEART_RATE_DIR = os.path.join(DEMO_ROOT, "heart-rate")
ASSETS_DIR = os.path.join(DEMO_ROOT, "assets")

# ----------------------------
# Experience (Hue + Audio) config
# ----------------------------
BRIDGE_IP = "192.168.0.173"
LIGHTS = [6, 8]

LIGHT_COLOR_CALM = {"hue": 6536, "sat": 250, "bri": 100}
LIGHT_COLOR_STRESS = {"hue": 2000, "sat": 250, "bri": 254}
LIGHT_COLOR_NEUTRAL = {"hue": 8500, "sat": 25, "bri": 130}  # adjust later on-site

AUDIO_FILE_STRESS = os.path.join(HEART_RATE_DIR, "Stress.wav")
AUDIO_FILE_CALM = os.path.join(HEART_RATE_DIR, "Nature.wav")

HUE_DRY_RUN = os.getenv("HUE_DRY_RUN", "0") == "1"

hue_cfg = HueConfig(
    bridge_ip=BRIDGE_IP,
    lights=LIGHTS,
    neutral=LIGHT_COLOR_NEUTRAL,
    calm=LIGHT_COLOR_CALM,
    stress=LIGHT_COLOR_STRESS,
    dry_run=HUE_DRY_RUN,
)
hue_ctrl = HueController(hue_cfg)

audio_ctrl = AudioController(
    stress_wav_path=AUDIO_FILE_STRESS,
    calm_wav_path=AUDIO_FILE_CALM,
)

experience = LightSoundExperience(hue_ctrl, audio_ctrl)

# Default installation state: neutral (safe even in dry-run)
try:
    hue_ctrl.set_neutral()
except Exception:
    pass

# ----------------------------
# Cleanup (stop sound + lights on exit)
# ----------------------------
def _cleanup(*_args):
    try:
        experience.stop()
    except Exception:
        pass

def _cleanup_and_exit(signum, frame):
    _cleanup()
    raise KeyboardInterrupt

atexit.register(_cleanup)
signal.signal(signal.SIGINT, _cleanup_and_exit)
signal.signal(signal.SIGTERM, _cleanup_and_exit)

# ----------------------------
# UI routes (served by Flask)
# ----------------------------
@app.get("/")
def serve_index():
    return send_from_directory(HEART_RATE_DIR, "index.html")

@app.get("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(ASSETS_DIR, filename)

@app.get("/heart-rate/")
def serve_heart_rate_index():
    return send_from_directory(HEART_RATE_DIR, "index.html")

@app.get("/api/health")
def api_health():
    return jsonify({"ok": True})

# ----------------------------
# Visitors Database
# ----------------------------
@app.get("/api/visitors")
def get_visitors():
    with LOCK:
        return jsonify(VISITORS)

@app.post("/api/visitors")
def upsert_visitor():
    data = request.get_json(force=True)
    vid = data.get("id")
    if not vid:
        return jsonify({"error": "id is required"}), 400

    with LOCK:
        existing = next((v for v in VISITORS if v["id"] == vid), None)
        if existing is None:
            data.setdefault("createdAt", datetime.utcnow().isoformat() + "Z")
            VISITORS.append(data)
        else:
            existing.update(data)

    return jsonify({"status": "ok"})

# ----------------------------
# Experience endpoints
# ----------------------------
@app.post("/api/experience/baseline")
def api_experience_baseline():
    """
    Force baseline state:
    - stop any audio
    - set lights to neutral
    """
    try:
        status = experience.begin_baseline()
        return jsonify({"ok": True, "status": status})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post("/api/experience/stress/start")
def api_experience_stress_start():
    try:
        status = experience.start_stress()
        return jsonify({"ok": True, "status": status})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post("/api/experience/calm/start")
def api_experience_calm_start():
    try:
        status = experience.start_calm()
        return jsonify({"ok": True, "status": status})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post("/api/experience/stop")
def api_experience_stop():
    try:
        status = experience.stop()
        return jsonify({"ok": True, "status": status})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get("/api/experience/status")
def api_experience_status():
    try:
        return jsonify({"ok": True, "status": experience.status()})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


from flask import Flask, request, jsonify
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
CORS(app)  # allow requests from your demo laptops

VISITORS = []
LOCK = threading.Lock()


# ----------------------------
# Experience (Hue + Audio) config
# ----------------------------

BRIDGE_IP = "192.168.0.172"

# Update to your two bulb IDs:
LIGHTS = [7]  # e.g. [7, 8]

LIGHT_COLOR_CALM = {"hue": 40000, "sat": 254, "bri": 150}
LIGHT_COLOR_STRESS = {"hue": 1000, "sat": 254, "bri": 254}

# Resolve WAV file paths relative to repo root:
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEMO_DIR = os.path.join(REPO_ROOT, "demos", "heart-rate")

AUDIO_FILE_STRESS = os.path.join(DEMO_DIR, "Stress.wav")
AUDIO_FILE_CALM = os.path.join(DEMO_DIR, "Nature.wav")

# Dry Run
HUE_DRY_RUN = os.getenv("HUE_DRY_RUN", "0") == "1"

hue_cfg = HueConfig(
    bridge_ip=BRIDGE_IP,
    lights=LIGHTS,
    calm=LIGHT_COLOR_CALM,
    stress=LIGHT_COLOR_STRESS,
    dry_run=HUE_DRY_RUN,   # requires you to add dry_run to HueConfig as discussed
)
hue_ctrl = HueController(hue_cfg)

# Initialise controllers (single shared channel)
# hue_ctrl = HueController(
    # bridge_ip=BRIDGE_IP,
    # lights=LIGHTS,
    # calm=LIGHT_COLOR_CALM,
    # stress=LIGHT_COLOR_STRESS,
# )
audio_ctrl = AudioController(
    stress_wav_path=AUDIO_FILE_STRESS,
    calm_wav_path=AUDIO_FILE_CALM,
)
experience = LightSoundExperience(hue_ctrl, audio_ctrl)

def _cleanup(*_args):
    try:
        experience.stop()
    except Exception:
        pass

atexit.register(_cleanup)

signal.signal(signal.SIGINT, _cleanup)
signal.signal(signal.SIGTERM, _cleanup)


# ----------------------------
# Visitors Database
# ----------------------------
@app.get("/api/visitors")
def get_visitors():
    """Return all visitors."""
    with LOCK:
        return jsonify(VISITORS)

@app.post("/api/visitors")
def upsert_visitor():
    """Create or update a visitor."""
    data = request.get_json(force=True)
    vid = data.get("id")
    if not vid:
        return jsonify({"error": "id is required"}), 400

    with LOCK:
        existing = next((v for v in VISITORS if v["id"] == vid), None)
        if existing is None:
            # new visitor
            data.setdefault("createdAt", datetime.utcnow().isoformat() + "Z")
            VISITORS.append(data)
        else:
            # update existing (partial update)
            existing.update(data)

    return jsonify({"status": "ok"})

# ----------------------------
# New experience endpoints
# ----------------------------

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
    # Run on 0.0.0.0 so other laptops in the lab can reach it
    app.run(host="0.0.0.0", port=5000, debug=True)

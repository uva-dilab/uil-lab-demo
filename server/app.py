from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import threading

app = Flask(__name__)
CORS(app)  # allow requests from your demo laptops

VISITORS = []
LOCK = threading.Lock()

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

if __name__ == "__main__":
    # Run on 0.0.0.0 so other laptops in the lab can reach it
    app.run(host="0.0.0.0", port=5000, debug=True)

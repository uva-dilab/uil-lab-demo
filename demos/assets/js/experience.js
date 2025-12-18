// demos/assets/js/experience.js
// Minimal client for controlling the light+sound experience via Flask endpoints.
// Exposes: window.UILExperience

(function (global) {
  "use strict";

  async function postJSON(url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Non-JSON response from ${url} (HTTP ${res.status})`);
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data?.error || `Request failed: ${url} (HTTP ${res.status})`);
    }
    return data; // { ok: true, status: {...} }
  }

  async function getJSON(url) {
    const res = await fetch(url, { method: "GET" });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Non-JSON response from ${url} (HTTP ${res.status})`);
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data?.error || `Request failed: ${url} (HTTP ${res.status})`);
    }
    return data; // { ok: true, status: {...} }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMMSS(totalSec) {
    const s = Math.max(0, Math.floor(totalSec || 0));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${pad2(mm)}:${pad2(ss)}`;
  }

  const UILExperience = {
    baseline: () => postJSON("/api/experience/baseline"),
    startStress: () => postJSON("/api/experience/stress/start"),
    startCalm: () => postJSON("/api/experience/calm/start"),
    stop: () => postJSON("/api/experience/stop"),
    status: () => getJSON("/api/experience/status"),

    formatStatus(status) {
      if (!status) return "";

      if (status.is_playing) {
        const mode = status.mode || "unknown";
        const remaining = typeof status.remaining_sec === "number" ? status.remaining_sec : null;
        if (remaining != null) return `Playing: ${mode} (${formatMMSS(remaining)})`;
        return `Playing: ${mode}`;
      }

      return "Neutral (idle)";
    },

    formatMMSS,
  };

  global.UILExperience = UILExperience;
})(window);


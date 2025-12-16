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
    return data; // { ok: true, status: { mode, is_playing } }
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
    return data; // { ok: true, status: { mode, is_playing } }
  }

  const UILExperience = {
    startStress: () => postJSON("/api/experience/stress/start"),
    startCalm: () => postJSON("/api/experience/calm/start"),
    stop: () => postJSON("/api/experience/stop"),
    status: () => getJSON("/api/experience/status"),

    formatStatus(status) {
      if (!status) return "";
      if (status.is_playing) return `Playing: ${status.mode || "unknown"}`;
      return "Stopped";
    },
  };

  global.UILExperience = UILExperience;
})(window);


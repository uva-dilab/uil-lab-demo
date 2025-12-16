// heart-rate.js
// Main app controller: routing, entry view, initialisation
// Name-less entry flow: Rest -> Stress -> Relax (Enter each), auto-finish.
// Added: Sound + Hue experience controls (Start Stress / Start Calm / Stop + status + Escape panic stop)

(function (global) {
  const UILStorage = global.UILStorage;
  const UILChartView = global.UILChartView;
  const UILVisitorsHistoryView = global.UILVisitorsHistoryView;
  const UILExperience = global.UILExperience;

  if (!UILStorage) {
    console.error("[heart-rate.js] UILStorage is not available. Check storage.js.");
    return;
  }

  console.log("[heart-rate.js] Initialising app...");

  let currentVisitor = null;

  function getViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "entry";
  }

  function getStationIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const station = params.get("station");
    return station ? parseInt(station, 10) : null;
  }

  function showView(viewName) {
    const entry = document.getElementById("entryView");
    const graph = document.getElementById("graphView");
    const envelope = document.getElementById("envelopeView");

    if (!entry || !graph || !envelope) return;

    entry.style.display = "none";
    graph.style.display = "none";
    envelope.style.display = "none";

    if (viewName === "entry") entry.style.display = "block";
    if (viewName === "graph") graph.style.display = "block";
    if (viewName === "envelope") envelope.style.display = "block";
  }

  function newVisitorObject(stationId) {
    const id = Date.now().toString() + "-" + (stationId || "X");
    return {
      id,
      name: "", // keep field for compatibility; unused
      stationId: stationId,
      resting: null,
      stress: null,
      relax: null,
      createdAt: new Date().toISOString(),
    };
  }

  function parseNumber(inputEl) {
    if (!inputEl) return null;
    const v = parseFloat(inputEl.value);
    return Number.isFinite(v) ? v : null;
  }

  async function safeUpsert(visitor) {
    try {
      await UILStorage.upsertVisitor(visitor);
    } catch (e) {
      console.error("[heart-rate.js] upsert failed:", e);
    }
  }

  function clear(el) {
    if (el) el.value = "";
  }

  function focus(el) {
    if (el) el.focus();
  }

  // ----------------------------
  // Experience controls (Sound + Hue)
  // Requires these elements in Entry view:
  //   #startStressBtn, #startCalmBtn, #stopExperienceBtn, #experienceStatus
  // And experience.js loaded before heart-rate.js.
  // ----------------------------
  function setupExperienceControls() {
    const startStressBtn = document.getElementById("startStressBtn");
    const startCalmBtn = document.getElementById("startCalmBtn");
    const stopExperienceBtn = document.getElementById("stopExperienceBtn");
    const statusEl = document.getElementById("experienceStatus");

    // If buttons are not present, silently skip (keeps entry view flexible)
    if (!startStressBtn && !startCalmBtn && !stopExperienceBtn && !statusEl) {
      return;
    }

    if (!UILExperience) {
      console.warn(
        "[heart-rate.js] UILExperience is not available. Check that experience.js is included before heart-rate.js."
      );
      if (statusEl) statusEl.textContent = "Experience controls unavailable.";
      return;
    }

    function render(status) {
      if (!statusEl) return;
      statusEl.textContent = UILExperience.formatStatus(status);
    }

    async function refresh() {
      try {
        const data = await UILExperience.status(); // { ok, status }
        render(data.status);
      } catch (e) {
        if (statusEl) statusEl.textContent = `Status error: ${e.message}`;
      }
    }

    async function handle(actionFn) {
      try {
        const data = await actionFn(); // { ok, status }
        render(data.status);
      } catch (e) {
        if (statusEl) statusEl.textContent = `Error: ${e.message}`;
      }
    }

    if (startStressBtn) startStressBtn.addEventListener("click", () => handle(UILExperience.startStress));
    if (startCalmBtn) startCalmBtn.addEventListener("click", () => handle(UILExperience.startCalm));
    if (stopExperienceBtn) stopExperienceBtn.addEventListener("click", () => handle(UILExperience.stop));

    // Panic stop on Escape (excellent for exhibitions)
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      UILExperience.stop()
        .then((data) => render(data.status))
        .catch(() => {});
    });

    // Initial status read
    refresh();
  }

  function setupEntryView() {
    const stationId = getStationIdFromUrl();

    const restEl = document.getElementById("restInput");
    const stressEl = document.getElementById("stressInput");
    const relaxEl = document.getElementById("relaxInput");

    if (!restEl || !stressEl || !relaxEl) {
      console.warn("[heart-rate.js] Entry inputs not found.");
      return;
    }

    setupExperienceControls();

    async function ensureVisitor() {
      if (currentVisitor) return;

      // NEW: force baseline (neutral) at the start of each visitor
      if (UILExperience && typeof UILExperience.baseline === "function") {
        try {
          await UILExperience.baseline();
        } catch (e) {
          console.warn("[heart-rate.js] baseline call failed:", e);
        }
      }

      currentVisitor = newVisitorObject(stationId);
      await safeUpsert(currentVisitor); // create record immediately
    }

    async function saveRest() {
      const rest = parseNumber(restEl);
      if (rest == null) return;
      await ensureVisitor();
      currentVisitor.resting = rest;
      await safeUpsert(currentVisitor);
      clear(restEl);
      focus(stressEl);
    }

    async function saveStress() {
      const stress = parseNumber(stressEl);
      if (stress == null) return;
      await ensureVisitor();
      currentVisitor.stress = stress;
      await safeUpsert(currentVisitor);
      clear(stressEl);
      focus(relaxEl);
    }

    async function saveRelaxAndFinish() {
      const relax = parseNumber(relaxEl);
      if (relax == null) return;
      await ensureVisitor();
      currentVisitor.relax = relax;
      await safeUpsert(currentVisitor);

      // NEW: return lights to neutral at end of visitor
      if (UILExperience && typeof UILExperience.stop === "function") {
        try {
          await UILExperience.stop();
        } catch (e) {
          console.warn("[heart-rate.js] stop at finish failed:", e);
        }
      }

      currentVisitor = null;
      clear(relaxEl);
      focus(restEl);
    }

    restEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      saveRest();
    });

    stressEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      saveStress();
    });

    relaxEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      saveRelaxAndFinish();
    });

    const saveRestBtn = document.getElementById("saveRestBtn");
    const saveStressBtn = document.getElementById("saveStressBtn");
    const saveRelaxBtn = document.getElementById("saveRelaxBtn");

    if (saveRestBtn) saveRestBtn.addEventListener("click", saveRest);
    if (saveStressBtn) saveStressBtn.addEventListener("click", saveStress);
    if (saveRelaxBtn) saveRelaxBtn.addEventListener("click", saveRelaxAndFinish);

    focus(restEl);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const view = getViewFromUrl();
    console.log("[heart-rate.js] DOMContentLoaded, view =", view);
    showView(view);

    if (view === "entry") {
      setupEntryView();
    } else if (view === "graph") {
      if (!UILChartView) {
        console.error("[heart-rate.js] UILChartView is not available. Check chart-view.js.");
        return;
      }
      UILChartView.setupGraphView();
    } else if (view === "envelope") {
      if (!UILVisitorsHistoryView) {
        console.error("[heart-rate.js] UILVisitorsHistoryView is not available.");
        return;
      }
      UILVisitorsHistoryView.setupVisitorsHistoryView();
    }
  });
})(window);


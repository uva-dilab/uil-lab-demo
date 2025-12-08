// heart-rate.js
// Main app controller: routing, entry view, initialisation

(function (global) {
  const UILStorage = global.UILStorage;
  const UILChartView = global.UILChartView;
  const UILVisitorsHistoryView = global.UILVisitorsHistoryView;


  if (!UILStorage) {
    console.error("[heart-rate.js] UILStorage is not available. Check storage.js.");
    return;
  }

  console.log("[heart-rate.js] Initialising app...");

  let currentVisitor = null;

  function getViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "entry"; // default to entry
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

    if (viewName === "entry") {
      entry.style.display = "block";
    } else if (viewName === "graph") {
      graph.style.display = "block";
    } else if (viewName === "envelope") { 
      envelope.style.display = "block";
    }
  }

  function updateCurrentVisitorLabel() {
    const label = document.getElementById("currentVisitorLabel");
    if (!label) return;

    if (!currentVisitor) {
      label.innerHTML = "<em>No active visitor.</em>";
      return;
    }

    const v = currentVisitor;
    const parts = [];
    parts.push('Active visitor: <strong>' + v.name + "</strong>");
    parts.push("Rest: " + (v.resting != null ? v.resting + " bpm" : "–"));
    parts.push("Stress: " + (v.stress != null ? v.stress + " bpm" : "–"));
    parts.push("Relax: " + (v.relax != null ? v.relax + " bpm" : "–"));

    label.innerHTML = parts.join(" | ");
  }

  function setupEntryView() {
    const stationId = getStationIdFromUrl();

    const startBtn = document.getElementById("startVisitorBtn");
    const saveRestBtn = document.getElementById("saveRestBtn");
    const saveStressBtn = document.getElementById("saveStressBtn");
    const saveRelaxBtn = document.getElementById("saveRelaxBtn");
    const statusEl = document.getElementById("entryStatus");

    const nameEl = document.getElementById("nameInput");
    const restEl = document.getElementById("restInput");
    const stressEl = document.getElementById("stressInput");
    const relaxEl = document.getElementById("relaxInput");

    if (!startBtn || !saveRestBtn || !saveStressBtn || !saveRelaxBtn || !statusEl) {
      console.warn("[heart-rate.js] Entry elements not found:", {
        startBtn,
        saveRestBtn,
        saveStressBtn,
        saveRelaxBtn,
        statusEl,
      });
      return;
    }

    // Optional: station label in header, if present
    const stationLabelEl = document.getElementById("entryStationLabel");
    if (stationLabelEl) {
      stationLabelEl.textContent = stationId ? `Station ${stationId}` : "Station";
    }

    console.log("[heart-rate.js] setupEntryView attached (station =", stationId, ")");

    async function saveRest() {
      if (!currentVisitor) {
        statusEl.textContent = "";
        return;
      }
      const rest = parseFloat(restEl && restEl.value);
      if (isNaN(rest)) {
        statusEl.textContent = "";
        return;
      }
      currentVisitor.resting = rest;
      await UILStorage.upsertVisitor(currentVisitor);
      statusEl.textContent = "";
      if (restEl) restEl.value = "";
      updateCurrentVisitorLabel();
      if (stressEl) stressEl.focus();
    }

    async function saveStress() {
      if (!currentVisitor) {
        statusEl.textContent = "";
        return;
      }
      const stress = parseFloat(stressEl && stressEl.value);
      if (isNaN(stress)) {
        statusEl.textContent = "";
        return;
      }
      currentVisitor.stress = stress;
      await UILStorage.upsertVisitor(currentVisitor);
      statusEl.textContent = "";
      if (stressEl) stressEl.value = "";
      updateCurrentVisitorLabel();
      if (relaxEl) relaxEl.focus();
    }

    async function saveRelax(autoFinish = true) {
      if (!currentVisitor) {
        statusEl.textContent = "";
        return;
      }
      const relax = parseFloat(relaxEl && relaxEl.value);
      if (isNaN(relax)) {
        statusEl.textContent = "";
        return;
      }
      currentVisitor.relax = relax;
      await UILStorage.upsertVisitor(currentVisitor);
      if (relaxEl) relaxEl.value = "";
      updateCurrentVisitorLabel();

      if (autoFinish) {
        statusEl.textContent = "";
        currentVisitor = null;
        updateCurrentVisitorLabel();
        if (nameEl) nameEl.focus();
      } else {
        statusEl.textContent = "";
      }
    }

    // BUTTON HANDLERS

    startBtn.addEventListener("click", async function () {
      const name = (nameEl && nameEl.value ? nameEl.value : "").trim() || "Visitor";
      const id = Date.now().toString() + "-" + (stationId || "X");

      currentVisitor = {
        id,
        name,
        stationId: stationId,
        resting: null,
        stress: null,
        relax: null,
        createdAt: new Date().toISOString(),
      };

      await UILStorage.upsertVisitor(currentVisitor);
      statusEl.textContent = "";
      updateCurrentVisitorLabel();

      if (restEl) restEl.focus();
    });

    saveRestBtn.addEventListener("click", function () {
      saveRest();
    });

    saveStressBtn.addEventListener("click", function () {
      saveStress();
    });

    saveRelaxBtn.addEventListener("click", function () {
      // Manual save, still auto-finish by default
      saveRelax(true);
    });

    // ENTER-KEY SHORTCUTS FOR FASTER FLOW

    if (restEl) {
      restEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          saveRest();
        }
      });
    }

    if (stressEl) {
      stressEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          saveStress();
        }
      });
    }

    if (relaxEl) {
      relaxEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          // Enter on relax = save + auto-finish
          saveRelax(true);
        }
      });
    }

    updateCurrentVisitorLabel();
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


// heart-rate.js
// Main app controller: routing, entry view, initialisation

(function (global) {
  const UILStorage = global.UILStorage;
  const UILChartView = global.UILChartView;
  const UILScoreboardView = global.UILScoreboardView;

  if (!UILStorage) {
    console.error("[heart-rate.js] UILStorage is not available. Check that storage.js is loaded first.");
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
    const scoreboard = document.getElementById("scoreboardView");

    if (!entry || !graph || !scoreboard) return;

    entry.style.display = "none";
    graph.style.display = "none";
    scoreboard.style.display = "none";

    if (viewName === "entry") {
      entry.style.display = "block";
    } else if (viewName === "graph") {
      graph.style.display = "block";
    } else if (viewName === "scoreboard") {
      scoreboard.style.display = "block";
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
    const finishBtn = document.getElementById("finishVisitorBtn");
    const statusEl = document.getElementById("entryStatus");

    if (!startBtn || !saveRestBtn || !saveStressBtn || !saveRelaxBtn || !finishBtn || !statusEl) {
      console.warn("[heart-rate.js] Entry elements not found.");
      return;
    }

    console.log("[heart-rate.js] setupEntryView attached (station =", stationId, ")");

    startBtn.addEventListener("click", async function () {
      const nameEl = document.getElementById("nameInput");
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
      statusEl.textContent =
        'Started new visitor "' + name + '". Now measure resting heart rate.';
      updateCurrentVisitorLabel();
    });

    saveRestBtn.addEventListener("click", async function () {
      if (!currentVisitor) {
        statusEl.textContent = "Start a visitor first.";
        return;
      }
      const restEl = document.getElementById("restInput");
      const rest = parseFloat(restEl && restEl.value);
      if (isNaN(rest)) {
        statusEl.textContent = "Enter a valid Rest HR.";
        return;
      }
      currentVisitor.resting = rest;
      await UILStorage.upsertVisitor(currentVisitor);
      statusEl.textContent = "Saved Rest HR (" + rest + " bpm). Now play the stress sound.";
      if (restEl) restEl.value = "";
      updateCurrentVisitorLabel();
    });

    saveStressBtn.addEventListener("click", async function () {
      if (!currentVisitor) {
        statusEl.textContent = "Start a visitor first.";
        return;
      }
      const stressEl = document.getElementById("stressInput");
      const stress = parseFloat(stressEl && stressEl.value);
      if (isNaN(stress)) {
        statusEl.textContent = "Enter a valid Stress HR.";
        return;
      }
      currentVisitor.stress = stress;
      await UILStorage.upsertVisitor(currentVisitor);
      statusEl.textContent = "Saved Stress HR (" + stress + " bpm). Now play the relax sound.";
      if (stressEl) stressEl.value = "";
      updateCurrentVisitorLabel();
    });

    saveRelaxBtn.addEventListener("click", async function () {
      if (!currentVisitor) {
        statusEl.textContent = "Start a visitor first.";
        return;
      }
      const relaxEl = document.getElementById("relaxInput");
      const relax = parseFloat(relaxEl && relaxEl.value);
      if (isNaN(relax)) {
        statusEl.textContent = "Enter a valid Relax HR.";
        return;
      }
      currentVisitor.relax = relax;
      await UILStorage.upsertVisitor(currentVisitor);
      statusEl.textContent =
        "Saved Relax HR (" + relax + " bpm). You can now finish this visitor.";
      if (relaxEl) relaxEl.value = "";
      updateCurrentVisitorLabel();
    });

    finishBtn.addEventListener("click", function () {
      if (!currentVisitor) {
        statusEl.textContent = "No active visitor to finish.";
        return;
      }
      statusEl.textContent =
        'Finished visitor "' + currentVisitor.name + '". All values (Rest/Stress/Relax) saved.';
      currentVisitor = null;
      updateCurrentVisitorLabel();
    });

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
    } else if (view === "scoreboard") {
      if (!UILScoreboardView) {
        console.error("[heart-rate.js] UILScoreboardView is not available. Check scoreboard-view.js.");
        return;
      }
      UILScoreboardView.setupScoreboardView();
    }
  });
})(window);


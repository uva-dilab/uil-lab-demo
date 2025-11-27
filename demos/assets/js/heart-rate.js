// heart-rate.js
// Main app controller: routing, entry view, initialisation

(function (global) {
  var UILStorage = global.UILStorage;
  var UILChartView = global.UILChartView;
  var UILScoreboardView = global.UILScoreboardView;

  if (!UILStorage) {
    console.error("[heart-rate.js] UILStorage is not available. Check that storage.js is loaded first.");
    return;
  }

  console.log("[heart-rate.js] Initialising app...");

  // ---------- View switching ----------

  function getViewFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("view") || "entry"; // default to entry
  }

  function showView(viewName) {
    var entry = document.getElementById("entryView");
    var graph = document.getElementById("graphView");
    var scoreboard = document.getElementById("scoreboardView");

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

  // ---------- ENTRY VIEW ----------

  function setupEntryView() {
    var saveBtn = document.getElementById("saveVisitorBtn");
    var statusEl = document.getElementById("entryStatus");

    if (!saveBtn || !statusEl) {
      console.warn("[heart-rate.js] Entry elements not found.");
      return;
    }

    console.log("[heart-rate.js] setupEntryView attached");

    saveBtn.addEventListener("click", function () {
      var nameEl = document.getElementById("nameInput");
      var restEl = document.getElementById("restInput");
      var stressEl = document.getElementById("stressInput");
      var relaxEl = document.getElementById("relaxInput");

      var name = (nameEl && nameEl.value ? nameEl.value : "").trim() || "Visitor";
      var rest = parseFloat(restEl && restEl.value);
      var stress = parseFloat(stressEl && stressEl.value);
      var relax = parseFloat(relaxEl && relaxEl.value);

      if (isNaN(rest) || isNaN(stress) || isNaN(relax)) {
        statusEl.textContent = "Please enter all three heart rates.";
        return;
      }

      var visitors = UILStorage.loadVisitors();
      var visitor = {
        id: Date.now(),
        name: name,
        resting: rest,
        stress: stress,
        relax: relax,
        createdAt: new Date().toISOString(),
      };

      visitors.push(visitor);
      UILStorage.saveVisitors(visitors);

      statusEl.textContent =
        'Saved visitor "' +
        name +
        '" with HRs: ' +
        rest +
        " / " +
        stress +
        " / " +
        relax +
        ".";

      if (restEl) restEl.value = "";
      if (stressEl) stressEl.value = "";
      if (relaxEl) relaxEl.value = "";
    });
  }

  // ---------- App init ----------

  document.addEventListener("DOMContentLoaded", function () {
    var view = getViewFromUrl();
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

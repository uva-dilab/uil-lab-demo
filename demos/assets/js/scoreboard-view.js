// scoreboard-view.js
// Everything related to the scoreboard screen

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage) {
    console.error("[scoreboard-view.js] UILStorage not found. Make sure storage.js is loaded first.");
    return;
  }

  const STORAGE_KEY = UILStorage.STORAGE_KEY;
  const loadVisitors = UILStorage.loadVisitors;

  function renderScoreboardView() {
    const pre = document.getElementById("scoreboardData");
    if (!pre) {
      console.warn("[scoreboard-view.js] scoreboardData element not found.");
      return;
    }

    const visitors = loadVisitors();

    if (!visitors.length) {
      pre.textContent = "No visitors yet.";
    } else {
      pre.textContent = "All visitors:\n" + JSON.stringify(visitors, null, 2);
    }
  }

  function setupScoreboardView() {
    console.log("[scoreboard-view.js] setupScoreboardView called");
    renderScoreboardView();

    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) {
        renderScoreboardView();
      }
    });
  }

  global.UILScoreboardView = {
    setupScoreboardView: setupScoreboardView,
  };
})(window);


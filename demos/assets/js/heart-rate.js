// UIL Heart Rate Demo – minimal 3-view app
// Main app controller: routing, entry view, scoreboard


/* ---------- View switching ---------- */

function getViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") || "entry"; // default to entry
}

function showView(viewName) {
  document.getElementById("entryView").style.display = "none";
  document.getElementById("graphView").style.display = "none";
  document.getElementById("scoreboardView").style.display = "none";

  if (viewName === "entry") {
    document.getElementById("entryView").style.display = "block";
  } else if (viewName === "graph") {
    document.getElementById("graphView").style.display = "block";
  } else if (viewName === "scoreboard") {
    document.getElementById("scoreboardView").style.display = "block";
  }
}

/* ---------- ENTRY VIEW ---------- */

function setupEntryView() {
  const saveBtn = document.getElementById("saveVisitorBtn");
  const statusEl = document.getElementById("entryStatus");

  saveBtn.addEventListener("click", () => {
    const name = document.getElementById("nameInput").value.trim() || "Visitor";
    const rest = parseFloat(document.getElementById("restInput").value);
    const stress = parseFloat(document.getElementById("stressInput").value);
    const relax = parseFloat(document.getElementById("relaxInput").value);

    if (isNaN(rest) || isNaN(stress) || isNaN(relax)) {
      statusEl.textContent = "Please enter all three heart rates.";
      return;
    }

    const visitors = loadVisitors();
    const visitor = {
      id: Date.now(),
      name,
      resting: rest,
      stress,
      relax,
      createdAt: new Date().toISOString()
    };
    visitors.push(visitor);
    saveVisitors(visitors);

    statusEl.textContent = `Saved visitor "${name}" with HRs: ${rest} / ${stress} / ${relax}.`;

    // Clear HR inputs for next visitor (keep name if you want)
    document.getElementById("restInput").value = "";
    document.getElementById("stressInput").value = "";
    document.getElementById("relaxInput").value = "";
  });
}

/* ---------- GRAPH VIEW ---------- */

function renderGraphView() {
  const pre = document.getElementById("graphData");
  const visitors = loadVisitors();
  const latest = visitors[visitors.length - 1];

  if (!latest) {
    pre.textContent = "No visitors yet.";
  } else {
    pre.textContent = "Latest visitor:\n" + JSON.stringify(latest, null, 2);
  }
}

function setupGraphView() {
  renderGraphView();

  // Re-render whenever another window updates localStorage
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      renderGraphView();
    }
  });
}

/* ---------- SCOREBOARD VIEW ---------- */

function renderScoreboardView() {
  const pre = document.getElementById("scoreboardData");
  const visitors = loadVisitors();

  if (!visitors.length) {
    pre.textContent = "No visitors yet.";
  } else {
    pre.textContent = "All visitors:\n" + JSON.stringify(visitors, null, 2);
  }
}

function setupScoreboardView() {
  renderScoreboardView();

  // Re-render whenever another window updates localStorage
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      renderScoreboardView();
    }
  });
}

//* ---------- App init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const view = getViewFromUrl();
  showView(view);

  if (view === "entry") {
    setupEntryView();
  } else if (view === "graph") {
    setupGraphView();
  } else if (view === "scoreboard") {
    setupScoreboardView();
  }

  console.log("Current view:", view);
})


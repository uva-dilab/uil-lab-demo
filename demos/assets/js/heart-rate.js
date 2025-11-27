// UIL Heart Rate Demo – minimal 3-view app

const STORAGE_KEY = "uil_hr_visitors_v1";
/* ---------- Storage helpers ---------- */

function loadVisitors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading visitors:", e);
    return [];
  }
}

function saveVisitors(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

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

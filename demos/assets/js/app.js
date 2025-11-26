// Heart Rate Story – UIL Demo
// Encapsulated in an IIFE to avoid polluting the global scope.

(() => {
  const STORAGE_KEY = "uil_hr_visitors_v1";

    /* ---------- Storage helpers ---------- */

  function loadVisitors() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to parse visitors:", e);
      return [];
    }
  }

  function saveVisitors(visitors) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
  }

  /* ---------- State ---------- */

  let visitors = loadVisitors();
  let currentVisitor = null;
  let hrChart = null;

  /* ---------- DOM references ---------- */
  let statusText;
  let visitorNameInput;
  let restingInput;
  let stressInput;
  let relaxInput;
  let scoreboardBody;
  let currentVisitorLabel;
  let summaryBox;
  let phaseTags;
  let sessionBtn;
  let scoreboardBtn;

  /* ---------- Initialisation ---------- */



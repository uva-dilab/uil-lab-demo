// storage.js
// Handles reading/writing visitors to localStorage

(function (global) {
  const STORAGE_KEY = "uil_hr_visitors_v1";

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

  // Expose a small API on a global namespace
  global.UILStorage = {
    STORAGE_KEY: STORAGE_KEY,
    loadVisitors: loadVisitors,
    saveVisitors: saveVisitors,
  };

  console.log("[storage.js] UILStorage initialised");
})(window);


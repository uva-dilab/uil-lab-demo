// storage.js
// Shared storage via a tiny Flask backend

(function (global) {
  // TODO: change this to the actual IP of the machine running Flask
  const API_BASE = "http://145.109.87.86:5000";

  async function loadVisitors() {
    const res = await fetch(API_BASE + "/api/visitors");
    if (!res.ok) {
      console.error("[storage.js] Failed to load visitors", res.status);
      return [];
    }
    return await res.json();
  }

  async function upsertVisitor(visitor) {
    const res = await fetch(API_BASE + "/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitor),
    });
    if (!res.ok) {
      console.error("[storage.js] Failed to upsert visitor", res.status);
    }
  }

  global.UILStorage = {
    loadVisitors,
    upsertVisitor,  // note: singular now
  };

  console.log("[storage.js] UILStorage initialised (backend mode)");
})(window);


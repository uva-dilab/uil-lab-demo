// storage.js
// Shared storage via a tiny Flask backend

(function (global) {
  //const API_BASE = "http://192.168.0.219:5000"; 
  //const API_BASE = "http://145.3.70.43:5000";
  const API_BASE = "http://192.168.178.207:5000";

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


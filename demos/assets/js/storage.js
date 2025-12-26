// storage.js
// Shared storage via the Flask backend (same-origin when UI is served by Flask)

(function (global) {
  "use strict";

  const VISITORS_ENDPOINT = "/api/visitors";

  async function loadVisitors() {
    const res = await fetch(VISITORS_ENDPOINT);
    if (!res.ok) {
      console.error("[storage.js] Failed to load visitors", res.status);
      return [];
    }
    return await res.json();
  }

  async function upsertVisitor(visitor) {
    const res = await fetch(VISITORS_ENDPOINT, {
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
    upsertVisitor, // note: singular now
  };

  console.log("[storage.js] UILStorage initialised (same-origin backend mode)");
})(window);


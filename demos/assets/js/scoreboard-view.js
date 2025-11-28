// scoreboard-view.js
// Everything related to the scoreboard screen (shared display)

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage) {
    console.error("[scoreboard-view] UILStorage not found. Make sure storage.js is loaded first.");
    return;
  }

  function formatDelta(rest, value) {
    if (typeof rest !== "number" || typeof value !== "number") return "–";
    const diff = value - rest;
    const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±0";
    return sign + Math.abs(diff).toFixed(0);
  }

  async function renderScoreboardView() {
    const container = document.getElementById("scoreboardContainer");
    if (!container) {
      console.warn("[scoreboard-view] #scoreboardContainer not found in DOM.");
      return;
    }

    container.textContent = "Loading…";

    let visitors = [];
    try {
      visitors = await UILStorage.loadVisitors();
    } catch (e) {
      console.error("[scoreboard-view] Failed to load visitors:", e);
      container.textContent = "Error loading data from server.";
      return;
    }

    if (!visitors.length) {
      container.textContent = "No visitors yet.";
      return;
    }

    // Sort by createdAt (newest first)
    visitors.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return a.createdAt < b.createdAt ? 1 : -1;
    });

    let html = `
      <table style="border-collapse: collapse; width: 100%; max-width: 900px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:4px 8px; border-bottom:1px solid #ccc;">Visitor</th>
            <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #ccc;">Station</th>
            <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #ccc;">Rest</th>
            <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #ccc;">Stress</th>
            <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #ccc;">Δ Stress–Rest</th>
            <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #ccc;">Relax</th>
            <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #ccc;">Δ Relax–Rest</th>
          </tr>
        </thead>
        <tbody>
    `;

    visitors.forEach((v) => {
      const rest = typeof v.resting === "number" ? v.resting : null;
      const stress = typeof v.stress === "number" ? v.stress : null;
      const relax = typeof v.relax === "number" ? v.relax : null;

      const stressDelta = formatDelta(rest, stress);
      const relaxDelta = formatDelta(rest, relax);

      html += `
        <tr>
          <td style="text-align:left; padding:4px 8px; border-bottom:1px solid #eee;">${v.name || "Visitor"}</td>
          <td style="text-align:right; padding:4px 8px; border-bottom:1px solid #eee;">${v.stationId ?? "–"}</td>
          <td style="text-align:right; padding:4px 8px; border-bottom:1px solid #eee;">${rest ?? "–"}</td>
          <td style="text-align:right; padding:4px 8px; border-bottom:1px solid #eee;">${stress ?? "–"}</td>
          <td style="text-align:right; padding:4px 8px; border-bottom:1px solid #eee;">${stressDelta}</td>
          <td style="text-align:right; padding:4px 8px; border-bottom:1px solid #eee;">${relax ?? "–"}</td>
          <td style="text-align:right; padding:4px 8px; border-bottom:1px solid #eee;">${relaxDelta}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  function setupScoreboardView() {
    console.log("[scoreboard-view] setupScoreboardView called");
    renderScoreboardView();
    // Update every 3 seconds to pick up new visitors
    setInterval(renderScoreboardView, 3000);
  }

  // Expose to main app
  global.UILScoreboardView = {
    setupScoreboardView,
  };
})(window);


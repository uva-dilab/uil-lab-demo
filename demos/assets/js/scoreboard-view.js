// scoreboard-view.js
// Everything related to the scoreboard screen (shared display)

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage) {
    console.error("[scoreboard-view] UILStorage not found. Make sure storage.js is loaded first.");
    return;
  }

  // Remember last data signature so we only re-render when data actually changes
  let lastSignature = null;

  function classifyRecovery(rest, relax) {
    if (typeof rest !== "number" || typeof relax !== "number") {
      return "";
    }
    const delta = relax - rest;

    // Simple thresholds for visual quality of recovery
    if (delta <= -3) {
      return "relax-good";       // recovered below baseline
    } else if (Math.abs(delta) < 3) {
      return "relax-flat";       // roughly back to baseline
    } else {
      return "relax-elevated";   // still noticeably elevated
    }
  }

  async function renderScoreboardView() {
    const container = document.getElementById("scoreboardContainer");
    if (!container) {
      console.warn("[scoreboard-view] #scoreboardContainer not found in DOM.");
      return;
    }

    // Only show "Loading…" before the very first successful render
    if (!lastSignature && container.innerHTML.trim() === "") {
      container.textContent = "Loading…";
    }

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
      lastSignature = null;
      return;
    }

    // Sort by createdAt (newest first)
    visitors.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return a.createdAt < b.createdAt ? 1 : -1;
    });

    // Build a compact signature of the data so we can detect changes
    const signature = JSON.stringify(
      visitors.map((v) => ({
        id: v.id,
        stationId: v.stationId,
        resting: v.resting,
        stress: v.stress,
        relax: v.relax,
        createdAt: v.createdAt,
      }))
    );

    // If nothing changed since last time, skip DOM work (no flashing)
    if (signature === lastSignature) {
      return;
    }

    let html = `
      <div class="scoreboard-shell">
        <h2 class="score-title">Visitors' Heart-rate</h2>
        <p class="score-subtitle">Baseline, stress, and recovery heart rates from visitors</p>
        <div class="scoreboard-table-wrapper">
          <table class="scoreboard-table">
            <thead>
              <tr>
                <th class="score-th score-th-name">Visitor</th>
                <th class="score-th score-th-station">Station</th>
                <th class="score-th score-th-number">Baseline (Rest)</th>
                <th class="score-th score-th-number">Stress</th>
                <th class="score-th score-th-number">Recovery (Relax)</th>
              </tr>
            </thead>
            <tbody>
    `;

    visitors.forEach((v, index) => {
      const rest = typeof v.resting === "number" ? v.resting : null;
      const stress = typeof v.stress === "number" ? v.stress : null;
      const relax = typeof v.relax === "number" ? v.relax : null;

      const stationLabel =
        v.stationId != null ? `Station ${v.stationId}` : "—";

      const recoveryClass = classifyRecovery(rest, relax);

      const rowClasses = ["scoreboard-row"];
      if (index % 2 === 1) {
        rowClasses.push("scoreboard-row-alt");
      }
      if (index === 0) {
        rowClasses.push("latest-row");
      }

      html += `
        <tr class="${rowClasses.join(" ")}">
          <td class="score-td score-name">
            ${v.name || "Visitor"}
          </td>
          <td class="score-td score-station">
            <span class="station-pill">${stationLabel}</span>
          </td>
          <td class="score-td score-number">
            ${rest ?? "–"}
          </td>
          <td class="score-td score-number">
            ${stress ?? "–"}
          </td>
          <td class="score-td score-number score-relax ${recoveryClass}">
            ${relax ?? "–"}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
    lastSignature = signature;
  }

  function setupScoreboardView() {
    console.log("[scoreboard-view] setupScoreboardView called");
    renderScoreboardView();
    // Update every 3 seconds to pick up new visitors (but now without flicker)
    setInterval(renderScoreboardView, 3000);
  }

  // Expose to main app
  global.UILScoreboardView = {
    setupScoreboardView,
  };
})(window);


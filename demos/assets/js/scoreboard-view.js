// scoreboard-view.js
// Everything related to the scoreboard screen (shared display)

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage) {
    console.error("[scoreboard-view] UILStorage not found. Make sure storage.js is loaded first.");
    return;
  }

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
      <div class="scoreboard-shell">
        <h2 class="score-title">UIL Heart-Rate Scoreboard</h2>
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


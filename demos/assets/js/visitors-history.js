// visitors-history.js
// Collective "heartbeat envelope" visualization with faint trails + latest visitor highlight
// Stable version with decoupled smooth breathing animation

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage || !global.Chart) {
    console.error("[visitors-history] UILStorage or Chart.js missing.");
    return;
  }

  let historyChart = null;
  let pollInterval = null;
  let lastSignature = null;

  // Breathing animation state
  let breathPhase = 0;
  let baseLow = null;
  let baseHigh = null;

  function computeEnvelope(visitors) {
    const rest = [];
    const stress = [];
    const relax = [];

    visitors.forEach(v => {
      if (typeof v.resting === "number") rest.push(v.resting);
      if (typeof v.stress === "number") stress.push(v.stress);
      if (typeof v.relax === "number") relax.push(v.relax);
    });

    if (!rest.length || !stress.length || !relax.length) return null;

    const low = [
      Math.min(...rest),
      Math.min(...stress),
      Math.min(...relax),
    ];

    const high = [
      Math.max(...rest),
      Math.max(...stress),
      Math.max(...relax),
    ];

    return { low, high };
  }

  function createEnvelopeGradient(ctx, height) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(56, 189, 248, 0.10)");
    grad.addColorStop(0.5, "rgba(34, 197, 94, 0.14)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0.02)");
    return grad;
  }

  // ✅ Smooth continuous breathing animation (NO data mutation)
  function animateBreathing() {
    if (!historyChart || !baseLow || !baseHigh) {
      requestAnimationFrame(animateBreathing);
      return;
    }

    const breathAmount = Math.sin(breathPhase) * 1.2;

    // Apply breathing offset to envelope only
    historyChart.data.datasets[0].data = baseLow.map(v => v + breathAmount);
    historyChart.data.datasets[1].data = baseHigh.map(v => v + breathAmount);

    historyChart.update("none"); // ✅ no animation, smooth visual drift only

    breathPhase += 0.015; // slow, calm breathing cycle
    requestAnimationFrame(animateBreathing);
  }

  async function renderVisitorsHistory() {
    const canvas = document.getElementById("visitorsHistoryChart");
    if (!canvas) return;

    let visitors = [];
    try {
      visitors = await UILStorage.loadVisitors();
    } catch (e) {
      console.error("[visitors-history] Failed to load visitors:", e);
      return;
    }

    if (!visitors.length) return;

    const signature = JSON.stringify(
      visitors.map(v => [v.id, v.resting, v.stress, v.relax])
    );

    const isNewData = signature !== lastSignature;
    lastSignature = signature;

    const envelope = computeEnvelope(visitors);
    if (!envelope) return;

    // ✅ Store BASE envelope only when data changes
    if (isNewData || !baseLow || !baseHigh) {
      baseLow = envelope.low;
      baseHigh = envelope.high;
    }

    const labels = ["Rest", "Stress", "Relax"];

    const latest = visitors[visitors.length - 1];
    const latestData = [
      latest.resting ?? null,
      latest.stress ?? null,
      latest.relax ?? null
    ];

    const ctx = canvas.getContext("2d");
    const envelopeGradient = createEnvelopeGradient(ctx, canvas.height);

    // ----- ENVELOPE DATASETS (BASE — NO BREATHING HERE) -----

    const lowerEnvelope = {
      label: "Envelope Lower",
      data: baseLow,
      tension: 0.55,
      borderWidth: 0,
      pointRadius: 0
    };

    const upperEnvelope = {
      label: "Envelope Upper",
      data: baseHigh,
      tension: 0.55,
      borderWidth: 0,
      pointRadius: 0,
      fill: { target: "-1" },
      backgroundColor: envelopeGradient
    };

    // ----- FAINT VISITOR TRAILS -----

    const trailDatasets = visitors.map(v => ({
      label: "Trail",
      data: [
        v.resting ?? null,
        v.stress ?? null,
        v.relax ?? null
      ],
      tension: 0.5,
      borderWidth: 1,
      pointRadius: 0,
      borderColor: "rgba(148,163,184,0.20)",
      fill: false
    }));

    // ----- LATEST VISITOR GLOW LINE -----

    const latestDataset = {
      label: "Latest Visitor",
      data: latestData,
      tension: 0.45,
      borderWidth: isNewData ? 4.2 : 3.2,
      pointRadius: isNewData ? 8 : 6,
      borderColor: "rgba(34,197,94,0.90)",
      pointBackgroundColor: "rgba(74,222,128,0.95)",
      pointBorderColor: "rgba(3,46,22,0.7)",
      pointBorderWidth: 1.5,
      fill: false
    };

    const allDatasets = [
      lowerEnvelope,
      upperEnvelope,
      ...trailDatasets,
      latestDataset
    ];

    // ----- RENDER / UPDATE -----

    if (!historyChart) {
      historyChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: allDatasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1200,
            easing: "easeInOutSine"
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { display: false },
              border: { display: false }
            },
            y: {
              grid: { display: false },
              ticks: { display: false },
              border: { display: false }
            }
          },
          interaction: {
            intersect: false,
            mode: "nearest"
          }
        }
      });
    } else if (isNewData) {
      // ✅ Only rebuild datasets when data truly changes
      historyChart.data.labels = labels;
      historyChart.data.datasets = allDatasets;
      historyChart.update();
    }
  }

  function setupVisitorsHistoryView() {
    console.log("[visitors-history] Setup");
    renderVisitorsHistory();

    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(renderVisitorsHistory, 2500);

    requestAnimationFrame(animateBreathing); // ✅ start smooth breathing loop
  }

  // Public API
  global.UILVisitorsHistoryView = {
    setupVisitorsHistoryView
  };
})(window);


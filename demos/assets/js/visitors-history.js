// visitors-history.js
// Collective "heartbeat envelope" visualization with faint trails + latest visitor highlight
// Fixes: (1) unstable "latest" due to unsorted data, (2) y-axis rescaling jumps.
// RED PLEXI EDITION: swap all blue/green palette to red/ember (no behaviour changes).

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

  // Lock Y-range to prevent reframing jumps
  let lockedYMin = null;
  let lockedYMax = null;

  function toTimeMs(iso) {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  }

  function stableSortVisitors(visitors) {
    // Prefer createdAt; fallback to numeric-ish id; final fallback: string compare
    return visitors.slice().sort((a, b) => {
      const ta = toTimeMs(a.createdAt);
      const tb = toTimeMs(b.createdAt);
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return 1;
      if (tb != null) return -1;

      const ida = a.id != null ? String(a.id) : "";
      const idb = b.id != null ? String(b.id) : "";
      if (ida < idb) return -1;
      if (ida > idb) return 1;
      return 0;
    });
  }

  function computeEnvelope(visitors) {
    const rest = [];
    const stress = [];
    const relax = [];

    visitors.forEach((v) => {
      if (typeof v.resting === "number") rest.push(v.resting);
      if (typeof v.stress === "number") stress.push(v.stress);
      if (typeof v.relax === "number") relax.push(v.relax);
    });

    // Need all three dimensions present to form a meaningful envelope
    if (!rest.length || !stress.length || !relax.length) return null;

    const low = [Math.min(...rest), Math.min(...stress), Math.min(...relax)];
    const high = [Math.max(...rest), Math.max(...stress), Math.max(...relax)];

    return { low, high };
  }

  function computeGlobalMinMax(visitors, pad = 8) {
    const nums = [];
    visitors.forEach((v) => {
      if (typeof v.resting === "number") nums.push(v.resting);
      if (typeof v.stress === "number") nums.push(v.stress);
      if (typeof v.relax === "number") nums.push(v.relax);
    });
    if (!nums.length) return null;

    const min = Math.min(...nums) - pad;
    const max = Math.max(...nums) + pad;
    return { min, max };
  }

  // Red/ember gradient for the envelope band (no blues/greens)
  function createEnvelopeGradient(ctx, height) {
    const h = height && height > 0 ? height : 600; // fallback for early renders
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255, 60, 90, 0.10)");   // crimson mist
    grad.addColorStop(0.5, "rgba(255, 120, 90, 0.14)"); // ember
    grad.addColorStop(1, "rgba(10, 2, 3, 0.02)");       // fade to near-black
    return grad;
  }

  // Smooth continuous breathing animation (does not change axes / framing)
  function animateBreathing() {
    if (!historyChart || !baseLow || !baseHigh) {
      requestAnimationFrame(animateBreathing);
      return;
    }

    const breathAmount = Math.sin(breathPhase) * 1.2;

    // Envelope datasets are [0]=lower, [1]=upper
    historyChart.data.datasets[0].data = baseLow.map((v) => v + breathAmount);
    historyChart.data.datasets[1].data = baseHigh.map((v) => v + breathAmount);

    historyChart.update("none"); // no transition; purely positional update

    breathPhase += 0.015;
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

    // Make ordering deterministic
    visitors = stableSortVisitors(visitors);

    // Only include values that matter for visuals (plus createdAt for stability)
    const signature = JSON.stringify(
      visitors.map((v) => [
        v.id,
        v.createdAt,
        v.stationId,
        v.resting,
        v.stress,
        v.relax,
      ])
    );

    const isNewData = signature !== lastSignature;
    lastSignature = signature;

    const envelope = computeEnvelope(visitors);
    if (!envelope) return;

    // Store base envelope when data changes (breathing applies on top)
    if (isNewData || !baseLow || !baseHigh) {
      baseLow = envelope.low;
      baseHigh = envelope.high;
    }

    // Lock Y-range (only expand, never shrink)
    const mm = computeGlobalMinMax(visitors, 10);
    if (mm) {
      if (lockedYMin == null || mm.min < lockedYMin) lockedYMin = mm.min;
      if (lockedYMax == null || mm.max > lockedYMax) lockedYMax = mm.max;
    }

    const labels = ["Rest", "Stress", "Relax"];

    const latest = visitors[visitors.length - 1]; // stable due to sorting
    const latestData = [latest.resting ?? null, latest.stress ?? null, latest.relax ?? null];

    const ctx = canvas.getContext("2d");
    const envelopeGradient = createEnvelopeGradient(ctx, canvas.height);

    const lowerEnvelope = {
      label: "Envelope Lower",
      data: baseLow, // breathing loop overwrites with breathed values
      tension: 0.55,
      borderWidth: 0,
      pointRadius: 0,
      order: 1,
    };

    const upperEnvelope = {
      label: "Envelope Upper",
      data: baseHigh, // breathing loop overwrites with breathed values
      tension: 0.55,
      borderWidth: 0,
      pointRadius: 0,
      fill: { target: "-1" },
      backgroundColor: envelopeGradient,
      order: 2,
    };

    // Trails (faint) — warm neutral / rose-grey, not green/blue
    const trailDatasets = visitors.map((v) => ({
      label: "Trail",
      data: [v.resting ?? null, v.stress ?? null, v.relax ?? null],
      tension: 0.5,
      borderWidth: 1,
      pointRadius: 0,
      borderColor: "rgba(254, 205, 211, 0.18)", // soft rose mist
      fill: false,
      order: 3,
    }));

    // Latest highlight — crimson line + ember points
    const latestDataset = {
      label: "Latest Visitor",
      data: latestData,
      tension: 0.45,
      borderWidth: isNewData ? 4.2 : 3.2,
      pointRadius: isNewData ? 8 : 6,

      borderColor: "rgba(255, 60, 90, 0.92)",
      pointBackgroundColor: "rgba(255, 120, 90, 0.95)",
      pointBorderColor: "rgba(40, 6, 10, 0.75)",
      pointBorderWidth: 1.5,

      fill: false,
      order: 4,
    };

    const allDatasets = [lowerEnvelope, upperEnvelope, ...trailDatasets, latestDataset];

    if (!historyChart) {
      historyChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: allDatasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,

          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { display: false },
              border: { display: false },
            },
            y: {
              min: lockedYMin != null ? lockedYMin : undefined,
              max: lockedYMax != null ? lockedYMax : undefined,
              grid: { display: false },
              ticks: { display: false },
              border: { display: false },
            },
          },
          interaction: { intersect: false, mode: "nearest" },
        },
      });
    } else if (isNewData) {
      // Update locked y-range
      if (historyChart.options?.scales?.y) {
        historyChart.options.scales.y.min = lockedYMin;
        historyChart.options.scales.y.max = lockedYMax;
      }

      historyChart.data.labels = labels;
      historyChart.data.datasets = allDatasets;

      historyChart.update("none");
    }
  }

  function setupVisitorsHistoryView() {
    console.log("[visitors-history] Setup");
    renderVisitorsHistory();

    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(renderVisitorsHistory, 2500);

    requestAnimationFrame(animateBreathing);
  }

  global.UILVisitorsHistoryView = {
    setupVisitorsHistoryView,
  };
})(window);


// chart-view.js
// Everything related to the graph screen

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage) {
    console.error("[chart-view.js] UILStorage not found. Make sure storage.js is loaded first.");
    return;
  }

  function getStationIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const station = params.get("station");
    return station ? parseInt(station, 10) : null;
  }

  let hrChart = null;
  let pollInterval = null;
  let lastDataSignature = null; // avoid reanimating identical data

  async function renderGraphView() {
    const statusEl = document.getElementById("graphStatus");
    const canvas = document.getElementById("hrChart");

    if (!statusEl || !canvas) {
      console.warn("[chart-view.js] Graph elements not found in DOM.");
      return;
    }

    const stationId = getStationIdFromUrl();
    let allVisitors = [];

    try {
      allVisitors = await UILStorage.loadVisitors();
    } catch (e) {
      console.error("[chart-view.js] Failed to load visitors:", e);
      statusEl.textContent = "Error loading data from server.";
      return;
    }

    let visitors = stationId != null
      ? allVisitors.filter((v) => v.stationId === stationId)
      : allVisitors;

    if (!visitors.length) {
      statusEl.textContent =
        stationId != null
          ? "No visitors yet for this station."
          : "No visitors yet.";
      if (hrChart) {
        hrChart.destroy();
        hrChart = null;
      }
      return;
    }

    const latest = visitors[visitors.length - 1];
    const { name, resting, stress, relax } = latest;

    const labels = ["Resting", "Stress", "Relax"];
    const dataPoints = [resting, stress, relax].map((v) =>
      typeof v === "number" ? v : null
    );
    const numeric = dataPoints.filter((v) => typeof v === "number");

    if (!numeric.length) {
      statusEl.textContent =
        "Latest visitor: " +
        (name || "Visitor") +
        " – waiting for heart rate values.";
      if (hrChart) {
        hrChart.destroy();
        hrChart = null;
      }
      return;
    }

    statusEl.innerHTML =
      `Latest visitor <strong>${name || "Visitor"}</strong> – ` +
      `Rest ${resting ?? "–"} → Stress ${stress ?? "–"} → Relax ${relax ?? "–"} BPM`;

    const signature = JSON.stringify({
      id: latest.id,
      stationId: latest.stationId,
      data: dataPoints,
    });

    const minVal = Math.min(...numeric);
    const maxVal = Math.max(...numeric);

    // 🔥 Dynamic breathing room — prevents first point from touching Y-axis
    const offset = Math.max(8, Math.round((maxVal - minVal) * 0.15));

    if (hrChart && signature === lastDataSignature) return;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.45)");
    gradient.addColorStop(1, "rgba(34, 197, 94, 0.03)");

    const datasetBase = {
      label: "Heart rate (BPM)",
      data: dataPoints,
      tension: 0.35,
      borderWidth: 3,
      pointRadius: 8,
      pointHoverRadius: 10,
      pointHitRadius: 14,
      spanGaps: true,
      fill: true,
      borderColor: "rgba(34, 197, 94, 0.95)",
      backgroundColor: gradient,
     // ✨ Animated, glowing, layered points
      pointBackgroundColor: "#22c55e",
      pointBorderColor: "#0f172a",
      pointBorderWidth: 3,
      pointStyle: "circle",
      pointRadius: 10,
      hoverRadius: 14,
      pointHoverBorderWidth: 4,

      //pointBackgroundColor: "#22c55e",
      //pointBorderColor: "#0f172a",
      //pointBorderWidth: 2,
    };

    if (!hrChart) {
      hrChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [datasetBase],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(15,23,42,0.95)",
              borderColor: "rgba(148,163,184,0.6)",
              borderWidth: 1,
              titleColor: "#e5e7eb",
              bodyColor: "#e5e7eb",
              bodyFont: { size: 18 },
              titleFont: { size: 20 },
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.formattedValue} BPM`,
              },
            },
          },

          // 📌 Dynamic Y-axis spacing incorporated here
          scales: {
            y: {
              title: {
                display: true,
                text: "Heart Rate (BPM)",
                color: "#E5E7EB",
                font: { size: 22, weight: "600" },
              },
              ticks: {
                color: "#d1d5db",
                font: { size: 18, weight: "600" },
                padding: 10,         // visual gap between labels & graph
              },
              grid: { color: "rgba(200,200,220,0.2)" },
              suggestedMin: minVal - offset,       // 💚 prevents hugging bottom
              suggestedMax: maxVal + offset * 0.6,
            },

            x: {
              title: {
                display: true,
                text: "Emotional State",
                color: "#E5E7EB",
                font: { size: 22, weight: "600" },
              },
              ticks: { color: "#ffffff", font: { size: 20, weight: "700" }},
              grid: { display: false },
            },
          },
        },
      });
    } else {
      // Update data only when changed
      hrChart.data.labels = labels;
      hrChart.data.datasets[0] = { ...hrChart.data.datasets[0], ...datasetBase };
      hrChart.options.scales.y.suggestedMin = minVal - offset;
      hrChart.options.scales.y.suggestedMax = maxVal + offset * 0.6;
      hrChart.update();
    }

    lastDataSignature = signature;
  }

  function setupGraphView() {
    console.log("[chart-view.js] setupGraphView called");
    renderGraphView();
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(renderGraphView, 2000);
  }

  global.UILChartView = { setupGraphView };
})(window);


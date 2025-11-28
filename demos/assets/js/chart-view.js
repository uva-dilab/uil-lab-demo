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

    let visitors = allVisitors;
    if (stationId != null) {
      visitors = allVisitors.filter((v) => v.stationId === stationId);
    }

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

    const labels = ["Rest", "Stress", "Relax"];
    const dataPoints = [resting, stress, relax].map((v) =>
      typeof v === "number" ? v : null
    );
    const numeric = dataPoints.filter((v) => typeof v === "number");

    if (!numeric.length) {
      statusEl.textContent =
        "Latest visitor: " +
        name +
        " – waiting for heart rate values (Rest, Stress, Relax).";
      if (hrChart) {
        hrChart.destroy();
        hrChart = null;
      }
      return;
    }

    statusEl.innerHTML =
      'Latest visitor <strong>' +
      (name || "Visitor") +
      "</strong> – Rest " +
      (resting != null ? resting + " bpm" : "–") +
      " → Stress " +
      (stress != null ? stress + " bpm" : "–") +
      " → Relax " +
      (relax != null ? relax + " bpm" : "–");

    const minVal = Math.min.apply(null, numeric);
    const maxVal = Math.max.apply(null, numeric);
    const padding = 5;
    const ctx = canvas.getContext("2d");

    // Nice gradient for the line fill
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.45)");
    gradient.addColorStop(1, "rgba(34, 197, 94, 0.03)");

    const datasetBase = {
      label: "Heart rate (BPM)",
      data: dataPoints,
      tension: 0.35,
      borderWidth: 3,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointHitRadius: 12,
      spanGaps: true,
      fill: true,
      borderColor: "rgba(34, 197, 94, 0.95)", // neon-ish green
      backgroundColor: gradient,
      pointBackgroundColor: "#22c55e",
      pointBorderColor: "#0f172a",
      pointBorderWidth: 2,
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
          animation: {
            duration: 400,
          },
          scales: {
            y: {
              suggestedMin: minVal - padding,
              suggestedMax: maxVal + padding,
              ticks: {
                color: "#9ca3af",
                font: { size: 11 },
              },
              grid: {
                color: "rgba(148, 163, 184, 0.25)",
              },
            },
            x: {
              ticks: {
                color: "#9ca3af",
                font: { size: 11 },
              },
              grid: {
                display: false,
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(15,23,42,0.95)",
              borderColor: "rgba(148,163,184,0.6)",
              borderWidth: 1,
              titleColor: "#e5e7eb",
              bodyColor: "#e5e7eb",
              padding: 8,
              displayColors: false,
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const val = context.formattedValue || "";
                  return label + ": " + val + " bpm";
                },
              },
            },
          },
        },
      });
    } else {
      hrChart.data.labels = labels;
      hrChart.data.datasets[0] = {
        ...hrChart.data.datasets[0],
        ...datasetBase,
      };
      hrChart.options.scales.y.suggestedMin = minVal - padding;
      hrChart.options.scales.y.suggestedMax = maxVal + padding;
      hrChart.update();
    }
  }

  function setupGraphView() {
    console.log("[chart-view.js] setupGraphView called");
    renderGraphView(); // initial

    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(renderGraphView, 2000);
  }

  global.UILChartView = {
    setupGraphView,
  };
})(window);


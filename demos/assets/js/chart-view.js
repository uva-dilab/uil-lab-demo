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
    const allVisitors = await UILStorage.loadVisitors();

    let visitors = allVisitors;
    if (stationId != null) {
      visitors = allVisitors.filter(v => v.stationId === stationId);
    }

    if (!visitors.length) {
      statusEl.textContent = stationId != null
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
    const dataPoints = [resting, stress, relax].map(v =>
      typeof v === "number" ? v : null
    );

    const numeric = dataPoints.filter(v => typeof v === "number");

    if (!numeric.length) {
      statusEl.textContent =
        "Latest visitor: " + name + " – no heart rate values recorded yet.";
      if (hrChart) {
        hrChart.destroy();
        hrChart = null;
      }
      return;
    }

    statusEl.textContent =
      "Latest visitor (station " + (latest.stationId ?? "–") + "): " +
      name +
      " — Rest " +
      (resting != null ? resting + " bpm" : "–") +
      " → Stress " +
      (stress != null ? stress + " bpm" : "–") +
      " → Relax " +
      (relax != null ? relax + " bpm" : "–");

    const minVal = Math.min.apply(null, numeric);
    const maxVal = Math.max.apply(null, numeric);
    const padding = 5;

    const ctx = canvas.getContext("2d");

    if (!hrChart) {
      hrChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Heart rate (BPM)",
              data: dataPoints,
              tension: 0.3,
              borderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 7,
              spanGaps: true,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          scales: {
            y: {
              suggestedMin: minVal - padding,
              suggestedMax: maxVal + padding,
              ticks: { color: "#333" },
              grid: { color: "rgba(0,0,0,0.1)" },
            },
            x: {
              ticks: { color: "#333" },
              grid: { display: false },
            },
          },
          plugins: {
            legend: {
              labels: { color: "#333" },
            },
          },
        },
      });
    } else {
      hrChart.data.labels = labels;
      hrChart.data.datasets[0].data = dataPoints;
      hrChart.options.scales.y.suggestedMin = minVal - padding;
      hrChart.options.scales.y.suggestedMax = maxVal + padding;
      hrChart.update();
    }
  }

  function setupGraphView() {
    console.log("[chart-view.js] setupGraphView called");
    renderGraphView(); // initial
    // poll every 2 seconds for updates
    pollInterval = setInterval(renderGraphView, 2000);
  }

  global.UILChartView = {
    setupGraphView,
  };
})(window);


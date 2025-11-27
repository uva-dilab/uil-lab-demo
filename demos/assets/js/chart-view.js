// chart-view.js
// Everything related to the graph screen

(function (global) {
  const UILStorage = global.UILStorage;
  if (!UILStorage) {
    console.error("[chart-view.js] UILStorage not found. Make sure storage.js is loaded first.");
    return;
  }

  const STORAGE_KEY = UILStorage.STORAGE_KEY;
  const loadVisitors = UILStorage.loadVisitors;

  let hrChart = null;

  function renderGraphView() {
    const statusEl = document.getElementById("graphStatus");
    const canvas = document.getElementById("hrChart");

    if (!statusEl || !canvas) {
      console.warn("[chart-view.js] Graph elements not found in DOM.");
      return;
    }

    const visitors = loadVisitors();

    if (!visitors.length) {
      statusEl.textContent = "No visitors yet – save one from the entry screen.";
      if (hrChart) {
        hrChart.destroy();
        hrChart = null;
      }
      return;
    }

    const latest = visitors[visitors.length - 1];
    const name = latest.name;
    const resting = latest.resting;
    const stress = latest.stress;
    const relax = latest.relax;

    statusEl.textContent =
      "Latest visitor: " +
      name +
      " — Rest " +
      resting +
      " → Stress " +
      stress +
      " → Relax " +
      relax +
      " bpm";

    const dataPoints = [resting, stress, relax];
    const labels = ["Rest", "Stress", "Relax"];
    const minVal = Math.min.apply(null, dataPoints);
    const maxVal = Math.max.apply(null, dataPoints);
    const padding = 5;

    const ctx = canvas.getContext("2d");

    if (!hrChart) {
      hrChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Heart rate (BPM)",
              data: dataPoints,
              tension: 0.3,
              borderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
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
    // Initial render
    renderGraphView();

    // Re-render whenever another window updates localStorage
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) {
        renderGraphView();
      }
    });
  }

  // Expose for the main app
  global.UILChartView = {
    setupGraphView: setupGraphView,
  };
})(window);


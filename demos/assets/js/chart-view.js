// chart-view.js
// Everything related to the graph screen

import { STORAGE_KEY, loadVisitors } from "./storage.js";

let hrChart = null;

function renderGraphView() {
  const statusEl = document.getElementById("graphStatus");
  const canvas = document.getElementById("hrChart");

  if (!statusEl || !canvas) {
    console.warn("Graph elements not found in DOM.");
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
  const { name, resting, stress, relax } = latest;

  statusEl.textContent =
    `Latest visitor: ${name} — Rest ${resting} → Stress ${stress} → Relax ${relax} bpm`;

  const dataPoints = [resting, stress, relax];
  const labels = ["Rest", "Stress", "Relax"];
  const minVal = Math.min(...dataPoints);
  const maxVal = Math.max(...dataPoints);
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
            fill: false
          }
        ]
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
            grid: { color: "rgba(0,0,0,0.1)" }
          },
          x: {
            ticks: { color: "#333" },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: { color: "#333" }
          }
        }
      }
    });
  } else {
    hrChart.data.labels = labels;
    hrChart.data.datasets[0].data = dataPoints;
    hrChart.options.scales.y.suggestedMin = minVal - padding;
    hrChart.options.scales.y.suggestedMax = maxVal + padding;
    hrChart.update();
  }
}

export function setupGraphView() {
  // Initial render
  renderGraphView();

  // Re-render whenever another window updates localStorage
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      renderGraphView();
    }
  });
}


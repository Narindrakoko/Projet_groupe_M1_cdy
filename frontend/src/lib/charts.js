import {
  ArcElement, BarElement, CategoryScale, Chart, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

/** Lit une variable CSS du thème courant. */
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function baseOptions({ legend = false, stacked = false } = {}) {
  const text = cssVar('--text-3');
  const grid = cssVar('--border');
  Chart.defaults.font.family = cssVar('--font');
  Chart.defaults.color = text;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: legend, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 } },
      tooltip: { padding: 10, cornerRadius: 6 },
    },
    scales: {
      x: { stacked, grid: { display: false }, ticks: { color: text } },
      y: { stacked, beginAtZero: true, grid: { color: grid }, ticks: { color: text, precision: 0 } },
    },
  };
}

export function doughnutOptions() {
  Chart.defaults.color = cssVar('--text-3');
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 12 } } },
  };
}

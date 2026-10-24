'use client';
// The panel's charts use the original Chart.js 2 build (assets/js/chart.min.js),
// loaded once, with the configuration of as/dashboard-admin.js /
// as/dashboard-default.js.
import { useEffect } from 'react';

let loading = null;
function loadChartJs() {
  if (typeof window !== 'undefined' && window.Chart) return Promise.resolve(window.Chart);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/panel/assets/js/chart.min.js';
    s.onload = () => resolve(window.Chart);
    s.onerror = reject;
    document.body.appendChild(s);
  });
  return loading;
}

/** Line chart of `data` (labels → values) with the dashboard options; `suffix(value)` for the tooltip. */
export function useLineChart(canvas, labels, values, chartLabel, suffix) {
  const key = JSON.stringify([labels, values]);
  useEffect(() => {
    if (!canvas || !labels) return;
    let chart;
    let alive = true;
    loadChartJs().then((Chart) => {
      if (!alive) return;
      chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: chartLabel, backgroundColor: 'transparent', borderColor: '#179970', pointBackgroundColor: '#179970', data: values }],
        },
        options: {
          scales: {
            xAxes: [{ gridLines: { display: false } }],
            yAxes: [
              {
                gridLines: { color: '#f6f6f6', zeroLineColor: '#f6f6f6', drawBorder: false },
                ticks: {
                  beginAtZero: true,
                  callback: (value) => (value % 1 === 0 ? value : undefined),
                },
              },
            ],
          },
          responsive: true,
          legend: { display: false },
          maintainAspectRatio: false,
          tooltips: {
            titleMarginBottom: 15,
            callbacks: { label: (tooltipItem) => ` ${tooltipItem.yLabel} ${suffix(tooltipItem.yLabel)}` },
          },
        },
      });
    });
    return () => {
      alive = false;
      chart?.destroy();
    };
    // key covers labels/values; label and suffix are constants of the widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, key]);
}

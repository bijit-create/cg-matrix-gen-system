// Precise rendering for math, charts, and geometry — no AI hallucination
// Uses deterministic libraries for accuracy

import katex from 'katex';

// --- Math equation rendering via KaTeX → SVG → Canvas PNG ---
export function renderMathToSvg(latex: string, displayMode = true): string {
  const html = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    output: 'html',
  });

  // Wrap in SVG foreignObject for canvas rendering
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" viewBox="0 0 800 200">
    <rect width="800" height="200" fill="white"/>
    <foreignObject width="800" height="200">
      <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;height:100%;font-size:28px;font-family:serif;">
        ${html}
      </div>
    </foreignObject>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// --- Bar/Pie chart rendering via Canvas ---
export function renderBarChart(
  data: { label: string; value: number; color?: string }[],
  title?: string,
  width = 800,
  height = 600
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const colors = ['#1565C0', '#E65100', '#2E7D32', '#7B1FA2', '#C62828', '#F57F17', '#00695C', '#283593'];
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(80, (width - 120) / data.length - 10);
  const chartLeft = 80;
  const chartTop = title ? 60 : 30;
  const chartBottom = height - 60;
  const chartHeight = chartBottom - chartTop;

  // Title
  if (title) {
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
  }

  // Y-axis
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartTop);
  ctx.lineTo(chartLeft, chartBottom);
  ctx.lineTo(width - 20, chartBottom);
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = '#666';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = chartBottom - (chartHeight * i / 5);
    const val = Math.round(maxVal * i / 5);
    ctx.fillText(String(val), chartLeft - 8, y + 4);
    // Grid line
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  // Bars
  const totalBarSpace = width - chartLeft - 40;
  const spacing = totalBarSpace / data.length;

  data.forEach((d, i) => {
    const barH = (d.value / maxVal) * chartHeight;
    const x = chartLeft + spacing * i + (spacing - barWidth) / 2;
    const y = chartBottom - barH;

    ctx.fillStyle = d.color || colors[i % colors.length];
    ctx.fillRect(x, y, barWidth, barH);

    // Value on top
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(d.value), x + barWidth / 2, y - 6);

    // Label below
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.save();
    ctx.translate(x + barWidth / 2, chartBottom + 10);
    ctx.rotate(-0.3);
    ctx.textAlign = 'left';
    ctx.fillText(d.label.slice(0, 15), 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

// --- Pie chart ---
export function renderPieChart(
  data: { label: string; value: number; color?: string }[],
  title?: string,
  width = 800,
  height = 600
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const colors = ['#1565C0', '#E65100', '#2E7D32', '#7B1FA2', '#C62828', '#F57F17', '#00695C', '#283593'];
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = width / 2 - 80;
  const cy = height / 2 + (title ? 15 : 0);
  const radius = Math.min(width, height) / 2 - 80;

  if (title) {
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
  }

  let startAngle = -Math.PI / 2;
  data.forEach((d, i) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    ctx.fillStyle = d.color || colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += sliceAngle;
  });

  // Legend
  const legendX = width - 200;
  let legendY = 80;
  ctx.font = '13px Arial';
  data.forEach((d, i) => {
    ctx.fillStyle = d.color || colors[i % colors.length];
    ctx.fillRect(legendX, legendY, 14, 14);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.label} (${Math.round(d.value / total * 100)}%)`, legendX + 20, legendY + 12);
    legendY += 24;
  });

  return canvas.toDataURL('image/png');
}

// --- Simple table rendering ---
export function renderTable(
  headers: string[],
  rows: string[][],
  title?: string,
  width = 800,
  height = 600
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const colWidth = (width - 40) / headers.length;
  const rowHeight = 36;
  const startX = 20;
  let startY = title ? 60 : 30;

  if (title) {
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
  }

  // Header row
  ctx.fillStyle = '#141414';
  ctx.fillRect(startX, startY, width - 40, rowHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  headers.forEach((h, i) => {
    ctx.fillText(h, startX + colWidth * i + colWidth / 2, startY + 23);
  });
  startY += rowHeight;

  // Data rows
  rows.forEach((row, ri) => {
    ctx.fillStyle = ri % 2 === 0 ? '#f8f8f8' : '#ffffff';
    ctx.fillRect(startX, startY, width - 40, rowHeight);

    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(startX, startY, width - 40, rowHeight);

    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    row.forEach((cell, ci) => {
      ctx.fillText(cell.slice(0, 20), startX + colWidth * ci + colWidth / 2, startY + 23);
    });
    startY += rowHeight;
  });

  return canvas.toDataURL('image/png');
}

// --- Line graph (distance-time, speed-time, coordinate plots, multi-segment) ---
// Deterministic canvas rendering — avoids AI hallucination of axes/values.
export function renderLineGraph(
  spec: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xMin?: number; xMax?: number;
    yMin?: number; yMax?: number;
    series: Array<{
      label?: string;
      color?: string;
      points: Array<{ x: number; y: number; label?: string }>;
    }>;
  },
  width = 900,
  height = 600
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const colors = ['#1565C0', '#E65100', '#2E7D32', '#7B1FA2', '#C62828', '#F57F17'];
  const series = spec.series || [];

  // Auto-range if not provided
  const allX = series.flatMap(s => s.points.map(p => p.x));
  const allY = series.flatMap(s => s.points.map(p => p.y));
  const xMin = spec.xMin ?? Math.min(0, ...allX);
  const xMax = spec.xMax ?? Math.max(...allX);
  const yMin = spec.yMin ?? Math.min(0, ...allY);
  const yMax = spec.yMax ?? Math.max(...allY);
  const xRange = Math.max(1e-6, xMax - xMin);
  const yRange = Math.max(1e-6, yMax - yMin);

  const padL = 80, padR = 40, padT = spec.title ? 60 : 30, padB = 80;
  const plotL = padL, plotR = width - padR;
  const plotT = padT, plotB = height - padB;
  const plotW = plotR - plotL;
  const plotH = plotB - plotT;

  const toPx = (x: number, y: number) => ({
    px: plotL + ((x - xMin) / xRange) * plotW,
    py: plotB - ((y - yMin) / yRange) * plotH,
  });

  // Title
  if (spec.title) {
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(spec.title, width / 2, 30);
  }

  // Gridlines + tick labels
  const niceStep = (range: number) => {
    const raw = range / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return step * mag;
  };
  const xStep = niceStep(xRange);
  const yStep = niceStep(yRange);

  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#666';
  ctx.font = '12px Arial';

  // Y grid + labels
  ctx.textAlign = 'right';
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax + 1e-9; v += yStep) {
    const { py } = toPx(xMin, v);
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(plotL, py);
    ctx.lineTo(plotR, py);
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.fillText(formatTick(v), plotL - 8, py + 4);
  }

  // X grid + labels
  ctx.textAlign = 'center';
  for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax + 1e-9; v += xStep) {
    const { px } = toPx(v, yMin);
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(px, plotT);
    ctx.lineTo(px, plotB);
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.fillText(formatTick(v), px, plotB + 18);
  }

  // Axes
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plotL, plotT);
  ctx.lineTo(plotL, plotB);
  ctx.lineTo(plotR, plotB);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#141414';
  ctx.font = 'bold 13px Arial';
  if (spec.xLabel) {
    ctx.textAlign = 'center';
    ctx.fillText(spec.xLabel, (plotL + plotR) / 2, height - 30);
  }
  if (spec.yLabel) {
    ctx.save();
    ctx.translate(22, (plotT + plotB) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(spec.yLabel, 0, 0);
    ctx.restore();
  }

  // Series
  series.forEach((s, si) => {
    const color = s.color || colors[si % colors.length];
    const pts = [...s.points].sort((a, b) => a.x - b.x);
    if (pts.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const { px, py } = toPx(p.x, p.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Point markers + labels
    pts.forEach(p => {
      const { px, py } = toPx(p.x, p.y);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      if (p.label) {
        ctx.fillStyle = '#141414';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(p.label, px + 8, py - 8);
      }
    });

    // Series legend (top-right)
    if (s.label) {
      const legendY = plotT + 20 + si * 20;
      const legendX = plotR - 140;
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 8, 14, 3);
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, legendX + 20, legendY - 2);
    }
  });

  return canvas.toDataURL('image/png');
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(Math.abs(v) < 1 ? 2 : 1);
}

// --- Number line ---
export function renderNumberLine(
  min: number, max: number, marks: { value: number; label?: string; color?: string }[],
  title?: string, width = 800, height = 200
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (title) {
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 25);
  }

  const lineY = height / 2 + 10;
  const lineLeft = 60;
  const lineRight = width - 60;
  const lineWidth = lineRight - lineLeft;

  // Main line
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lineLeft, lineY);
  ctx.lineTo(lineRight, lineY);
  ctx.stroke();

  // Arrows
  ctx.beginPath();
  ctx.moveTo(lineLeft - 10, lineY);
  ctx.lineTo(lineLeft, lineY - 5);
  ctx.lineTo(lineLeft, lineY + 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(lineRight + 10, lineY);
  ctx.lineTo(lineRight, lineY - 5);
  ctx.lineTo(lineRight, lineY + 5);
  ctx.fill();

  // Tick marks
  const range = max - min;
  const step = range <= 10 ? 1 : range <= 50 ? 5 : 10;
  for (let v = min; v <= max; v += step) {
    const x = lineLeft + ((v - min) / range) * lineWidth;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, lineY - 8);
    ctx.lineTo(x, lineY + 8);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(v), x, lineY + 24);
  }

  // Highlighted marks
  marks.forEach(m => {
    const x = lineLeft + ((m.value - min) / range) * lineWidth;
    ctx.fillStyle = m.color || '#E65100';
    ctx.beginPath();
    ctx.arc(x, lineY, 6, 0, Math.PI * 2);
    ctx.fill();
    if (m.label) {
      ctx.fillStyle = m.color || '#E65100';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, x, lineY - 16);
    }
  });

  return canvas.toDataURL('image/png');
}

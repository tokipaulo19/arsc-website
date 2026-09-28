const compact = new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

export function renderLineChart(canvas, series, options = {}) {
  const { context, width, height } = sizeCanvas(canvas);
  context.clearRect(0, 0, width, height);
  const all = series.flatMap((item) => item.points).filter((point) => Number.isFinite(point.value));
  if (!all.length) {
    context.fillStyle = "#6d6367";
    context.font = "14px Bai Jamjuree, Arial";
    context.fillText("No chart data available for this period.", 18, 32);
    return;
  }
  const padding = { top: 22, right: 18, bottom: 38, left: width < 520 ? 48 : 62 };
  const plotWidth = Math.max(10, width - padding.left - padding.right);
  const plotHeight = Math.max(10, height - padding.top - padding.bottom);
  const times = all.map((point) => new Date(`${point.date}T00:00:00Z`).getTime());
  const values = all.map((point) => point.value);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minValue = options.startAtZero === false ? Math.min(...values) : 0;
  const maxValue = Math.max(...values, 1);
  const x = (date) => {
    const time = new Date(`${date}T00:00:00Z`).getTime();
    return minTime === maxTime ? padding.left + plotWidth / 2 : padding.left + ((time - minTime) / (maxTime - minTime)) * plotWidth;
  };
  const y = (value) => padding.top + (1 - ((value - minValue) / Math.max(1, maxValue - minValue))) * plotHeight;
  context.font = "11px Bai Jamjuree, Arial";
  context.fillStyle = "#746a6e";
  context.strokeStyle = "#eadfe2";
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) {
    const tickY = padding.top + (plotHeight / 4) * tick;
    const tickValue = maxValue - ((maxValue - minValue) / 4) * tick;
    context.beginPath();
    context.moveTo(padding.left, tickY);
    context.lineTo(width - padding.right, tickY);
    context.stroke();
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(compact.format(tickValue), padding.left - 8, tickY);
  }
  [0, 0.5, 1].forEach((fraction) => {
    const time = minTime + (maxTime - minTime) * fraction;
    const tickX = padding.left + plotWidth * fraction;
    context.textAlign = fraction === 0 ? "left" : fraction === 1 ? "right" : "center";
    context.textBaseline = "top";
    context.fillText(shortDate.format(new Date(time)), tickX, height - padding.bottom + 13);
  });
  series.forEach((item) => {
    const valid = item.points.filter((point) => Number.isFinite(point.value));
    if (!valid.length) return;
    context.beginPath();
    valid.forEach((point, index) => {
      if (index === 0) context.moveTo(x(point.date), y(point.value));
      else context.lineTo(x(point.date), y(point.value));
    });
    context.strokeStyle = item.colour;
    context.lineWidth = 2.5;
    context.stroke();
    const latest = valid.at(-1);
    context.beginPath();
    context.arc(x(latest.date), y(latest.value), 4, 0, Math.PI * 2);
    context.fillStyle = item.colour;
    context.fill();
  });
  let legendX = padding.left;
  series.forEach((item) => {
    context.fillStyle = item.colour;
    context.fillRect(legendX, 4, 12, 3);
    context.fillStyle = "#4e4649";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(item.name, legendX + 17, 0);
    legendX += context.measureText(item.name).width + 48;
  });
}

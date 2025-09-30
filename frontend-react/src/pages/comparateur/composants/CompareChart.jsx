// frontend-react/src/components/charts/CompareChart.jsx
import { useEffect, useRef } from "react";

/**
 * Props:
 * - type: "bar" | "line" | "radar"
 * - buckets: string[]               // catégories (x)
 * - series: { label: string, values: (number|null)[] }[]
 * - valueType: "percentage" | "count"
 * - precision: number
 * - height?: number
 */
export default function CompareChart({
  type = "bar",
  buckets = [],
  series = [],
  valueType = "percentage",
  precision = 1,
  height = 360,
}) {
  const canvasRef = useRef(null);
  const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // Palette cohérente (6 teintes, réutilisées en boucle)
  const palette = [
    "#43A6FF", // c1
    "#9B59FF", // c2
    "#00D0A6", // c3
    "#FFA833", // c4
    "#FF2E8A", // c5
    "#6266FF", // c6
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const widthCss = Math.max(300, parent.clientWidth);
    const heightCss = height;

    canvas.width = Math.floor(widthCss * ratio);
    canvas.height = Math.floor(heightCss * ratio);
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    // Styles
    const padding = { top: 24, right: 16, bottom: 36, left: 44 };
    const plotW = widthCss - padding.left - padding.right;
    const plotH = heightCss - padding.top - padding.bottom;

    // BG subtil
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, widthCss, heightCss);

    // Axis helpers
    const flatVals = series.flatMap((s) => s.values).filter((v) => v != null);
    const maxVal = flatVals.length ? Math.max(...flatVals) : 1;
    const niceMax =
      valueType === "percentage"
        ? 1
        : Math.max(5, Math.ceil(maxVal / 5) * 5);

    // Y grid
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const steps = valueType === "percentage" ? 5 : 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (plotH * i) / steps;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
    }
    ctx.stroke();

    // Y labels
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + (plotH * i) / steps;
      const val =
        valueType === "percentage"
          ? `${Math.round(((steps - i) / steps) * 100)}%`
          : Math.round(((steps - i) / steps) * niceMax);
      ctx.fillText(val, padding.left - 8, y);
    }

    // X labels
    const x0 = padding.left;
    const y0 = padding.top + plotH;
    const n = Math.max(1, buckets.length);

    // Draw different chart types
    if (type === "bar") {
      const groupW = plotW / n;
      const barGap = 6;
      const barW = Math.max(6, (groupW - barGap * 2) / Math.max(1, series.length));

      buckets.forEach((b, bi) => {
        const gx = x0 + bi * groupW + barGap;
        // label X
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(b, gx + (groupW - barGap * 2) / 2, y0 + 8);
        ctx.restore();

        series.forEach((s, si) => {
          const v = s.values[bi];
          const color = palette[si % palette.length];
          const bx = gx + si * barW;
          const vh =
            v == null
              ? 0
              : valueType === "percentage"
              ? (v / 1) * plotH
              : (v / niceMax) * plotH;
          const top = y0 - vh;

          // barre
          ctx.fillStyle = color + "cc";
          ctx.fillRect(bx, top, barW - 2, vh);

          // valeur au-dessus
          if (v != null) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.font = "11px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            const text =
              valueType === "percentage"
                ? `${Math.round(v * 100)}%`
                : String(Math.round(v));
            ctx.fillText(text, bx + (barW - 2) / 2, top - 4);
          }
        });
      });
    } else if (type === "line") {
      // scales
      const xStep = buckets.length > 1 ? plotW / (buckets.length - 1) : 0;

      // X labels
      buckets.forEach((b, bi) => {
        const x = x0 + bi * xStep;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(b, x, y0 + 8);
        ctx.restore();
      });

      series.forEach((s, si) => {
        const color = palette[si % palette.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        buckets.forEach((_, bi) => {
          const v = s.values[bi];
          if (v == null) return;
          const x = x0 + bi * xStep;
          const y =
            valueType === "percentage"
              ? y0 - (v / 1) * plotH
              : y0 - (v / niceMax) * plotH;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // points
        buckets.forEach((_, bi) => {
          const v = s.values[bi];
          if (v == null) return;
          const x = x0 + bi * xStep;
          const y =
            valueType === "percentage"
              ? y0 - (v / 1) * plotH
              : y0 - (v / niceMax) * plotH;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    } else if (type === "radar") {
      // Radar simple centré
      const cx = padding.left + plotW / 2;
      const cy = padding.top + plotH / 2;
      const radius = Math.min(plotW, plotH) * 0.38;
      const m = Math.max(3, buckets.length);
      const angleStep = (Math.PI * 2) / m;

      // grille
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      const rings = 4;
      for (let r = 1; r <= rings; r++) {
        const rad = (radius * r) / rings;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      // axes + labels
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
      for (let i = 0; i < m; i++) {
        const a = -Math.PI / 2 + i * angleStep;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        // label
        const lx = cx + Math.cos(a) * (radius + 12);
        const ly = cy + Math.sin(a) * (radius + 12);
        ctx.textAlign = Math.cos(a) > 0.2 ? "left" : Math.cos(a) < -0.2 ? "right" : "center";
        ctx.textBaseline = Math.sin(a) > 0.2 ? "top" : Math.sin(a) < -0.2 ? "bottom" : "middle";
        ctx.fillText(buckets[i] || `#${i+1}`, lx, ly);
      }

      // séries
      series.forEach((s, si) => {
        const color = palette[si % palette.length];
        ctx.strokeStyle = color;
        ctx.fillStyle = color + "33";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let firstX = 0, firstY = 0;
        for (let i = 0; i < m; i++) {
          const v = s.values[i] ?? 0;
          const ratio =
            valueType === "percentage" ? Math.max(0, Math.min(1, v)) : Math.max(0, Math.min(1, v / niceMax));
          const a = -Math.PI / 2 + i * angleStep;
          const x = cx + Math.cos(a) * radius * ratio;
          const y = cy + Math.sin(a) * radius * ratio;
          if (i === 0) {
            ctx.moveTo(x, y);
            firstX = x; firstY = y;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(firstX, firstY);
        ctx.fill();
        ctx.stroke();
      });
    }

    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotH);
    ctx.lineTo(padding.left + plotW, padding.top + plotH);
    ctx.stroke();
  }, [type, buckets, series, valueType, precision, height, ratio]);

  return <canvas ref={canvasRef} className="cmp-canvas" role="img" aria-label="Comparateur chart" />;
}

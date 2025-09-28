import React, { useEffect, useRef } from "react";
import "./AnimatedEMABG.css";

/* utils */
function toRgba(color, alpha = 1) {
  if (!color) return `rgba(255,255,255,${alpha})`;
  if (color.startsWith("rgb")) return color;
  let c = color.replace("#", "");
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
const clamp01 = v => Math.min(0.98, Math.max(0.02, v));
const smoothInterp = (a, b, t) => { const u = t * t * (3 - 2 * t); return a * (1 - u) + b * u; };
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
}
const fmtPrice = (p, d) => Number(p).toFixed(d);

export default function AnimatedEMABG({
  /* vitesse / densité */
  speedPx = 9,
  segW = 22,           // plus petit => plus de bougies visibles
  /* dynamique verticale */
  volatility = 0.28,   // amplitude “moyenne”
  yPadding = 18,       // marge top/bottom en px (plus petit => occupe plus de hauteur)
  /* EMA */
  emaFastPeriod = 10,
  emaSlowPeriod = 30,
  lineFast = "#39c5ff",
  lineSlow = "#8ab4ff",
  glow = "rgba(59,130,246,0.24)",
  /* candles */
  showCandles = true,
  candleW = 18,        // corps quasi plein segment
  barGapPx = 2,        // petit espace entre bougies
  candleUp = "#10b981",
  candleDown = "#ef4444",
  wickAlpha = 0.7,
  bodyAlpha = 0.8,
  /* Wall-Street vibes */
  showFill = true,
  fillFastColor = "#39c5ff",
  showNeon = true,
  neonBlur = 10,
  showPillars = true,
  pillarCount = 6,
  pillarColor = "#39c5ff",
  showSparks = true,
  sparkCount = 18,
  sparkColor = "#9ad7ff",
  // Auto-scale vertical (comme un vrai chart)
  autoScale = true,
  scaleMargin = 0.12,    // marge haut/bas en % de la range
  scaleSmoothing = 0.10, // 0..1 : douceur du suivi (plus petit = plus smooth)
  minScaleSpan = 0.18,   // range min (en unités normalisées 0..1)
  //Follow-anchor (le chart suit le dernier prix)
  followAnchor = true,
  anchorPos = 0.62,      // 0 = haut, 1 = bas → 0.62 = prix ~62% depuis le haut
  // Anti-blocage bords (edge-guard)
  edgeGuard = true,       // active la protection
  edgeGuardPx = 12,       // seuil en px depuis le bord
  edgeSnap = 0.65,        // 0..1 : 1 = snap direct, 0.5 = rattrapage rapide
  /* PnL / trading fictif */
  interactiveTrading = true, // clic = ouvre/ferme une position
  showPnLDemo = false,       // si true et pas de position → PnL qui bouge tout seul
  showPnLOverlay = false,

  accountStart = 10000,      // $ fictifs
  positionSize = 1,          // “lots” fictifs
  pipValue = 10,             // $/pip par lot (EURUSD standard ≈ 10)
  pipFactor = 10000,         // pips = Δprix * pipFactor (EURUSD -> 10000)
  priceBase = 1.10000,       // centre de mapping (ex-EURUSD)
  priceRange = 0.01000,      // amplitude totale autour du centre
  pnlSmooth = 0.25,          // lissage visuel du PnL (0.15–0.35)
  pnlUpColor = "#10b981",
  pnlDownColor = "#ef4444",

    }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const PX = v => Math.round(v * DPR);
    let w, h;
    let lastTs = performance.now();
    let scrollX = 0;
    /* séries 0..1 */
    let base = [];
    let emaFast = [];
    let emaSlow = [];
    let candles = []; // {o,c,h,l}
    /* moteur de marché (anti-tunnel) */
    // régimes de vol + chocs + tendance
    let regime = 1.0, regimeTarget = 1.0;
    const regimeLow = 0.7, regimeHigh = 1.9, regimeChangeProb = 0.008; // switch rare
    let vel = 0;                // “vitesse” (tendance) persistante
    const trendPersistence = 0.94;
    const shockProb = 0.035;    // proba de pump/dump
    const shockAmp = 2.5;       // taille d’un choc (× volatility)

    /* Wall Street bg */
    let pillars = [];
    let sparks = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    // Domaine vertical dynamique (valeurs normalisées 0..1)
    let domMin = 0.35, domMax = 0.65; // init raisonnable
    // état trading/pnl
    let equity = accountStart;
    let realized = 0;
    let position = null; // { side: "long"|"short", entryV, entryPrice, size, ts }
    let dispPnL = 0;     // PnL affiché (lissé)


    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alphaFast = 2 / (emaFastPeriod + 1);
    const alphaSlow = 2 / (emaSlowPeriod + 1);
    const css = getComputedStyle(canvas);
    const lineFastCss = css.getPropertyValue("--market-line-fast").trim() || lineFast;
    const lineSlowCss = css.getPropertyValue("--market-line-slow").trim() || lineSlow;
    const fillCss     = css.getPropertyValue("--market-fill").trim() || fillFastColor;
    const pillarCss   = css.getPropertyValue("--market-pillar").trim() || pillarColor;
    const sparkCss    = css.getPropertyValue("--market-spark").trim() || sparkColor;
    const neonCss     = parseFloat(css.getPropertyValue("--market-neon-blur")) || neonBlur;
    const yPadCss     = parseFloat(css.getPropertyValue("--market-ypad")) || yPadding;
    const vToPrice = (v) => priceBase + (v - 0.5) * 2 * priceRange;

    const initWallstreet = () => {
      pillars = Array.from({ length: pillarCount }, () => ({
        x: Math.random() * w,
        w: Math.round(rand(6, 16) * DPR),
        phase: Math.random() * Math.PI * 2
      }));
      sparks = Array.from({ length: sparkCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: -rand(8, 18) * DPR / 1000,
        a: rand(0.35, 0.8)
      }));
    };

    const drawPillars = (now) => {
      if (!showPillars) return;
      for (const p of pillars) {
        const a = 0.05 + 0.05 * (1 + Math.sin(now * 0.001 + p.phase)) * 0.5;
        const g = ctx.createLinearGradient(p.x, 0, p.x, h);
        g.addColorStop(0, toRgba(pillarColor, 0));
        g.addColorStop(0.15, toRgba(pillarColor, a * 0.5));
        g.addColorStop(0.5, toRgba(pillarColor, a));
        g.addColorStop(1, toRgba(pillarColor, 0));
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.w / 2, 0, p.w, h);
      }
    };

    const drawSparks = (dt) => {
      if (!showSparks) return;
      for (const s of sparks) {
        s.y += s.vy * dt;
        if (s.y < -20 * DPR) { s.y = h + 20 * DPR; s.x = Math.random() * w; }
        const r = 2 * DPR;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 12 * DPR);
        g.addColorStop(0, toRgba(sparkColor, s.a));
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      }
    };

    const resize = () => {
      const { clientWidth, clientHeight } = canvas.parentElement;
      w = Math.round(clientWidth * DPR);
      h = Math.round(clientHeight * DPR);
      canvas.width = w; canvas.height = h;
      canvas.style.width = clientWidth + "px";
      canvas.style.height = clientHeight + "px";
      initPoints();
      initWallstreet();
    };

    // active les interactions si demandé
    canvas.style.pointerEvents = interactiveTrading ? "auto" : "none";

    const openPosition = (side, vNow) => {
      if (position) return; // une position à la fois
      position = {
        side,
        entryV: vNow,
        entryPrice: vToPrice(vNow),
        size: positionSize,
        ts: performance.now(),
      };
    };

    const closePosition = (vNow) => {
      if (!position) return;
      const exitPrice = vToPrice(vNow);
      const sign = position.side === "long" ? 1 : -1;
      const pips = (exitPrice - position.entryPrice) * pipFactor * sign;
      const pnl = pips * pipValue * position.size;
      realized += pnl;
      equity += pnl;
      position = null;
    };

    const onMouseDown = (e) => {
      if (!interactiveTrading) return;
      // calcule la valeur suivie (EMA du dessus à droite)
      // série “au-dessus” à droite
      let series;
      {
        const wx = (w - 2) + scrollX;
        const vF = sampleSeries(emaFast, wx);
        const vS = sampleSeries(emaSlow, wx);
        series = (vF >= vS) ? emaFast : emaSlow;
      }

      const vNow = sampleSeries(series, (w - 2) + scrollX);

      if (e.button === 0) { // gauche
        if (position) closePosition(vNow);
        else {
          const side = e.shiftKey ? "short" : "long"; // Shift = short
          openPosition(side, vNow);
        }
      }
    };

    const onContextMenu = (e) => {
      if (!interactiveTrading) return;
      e.preventDefault();
      // clic droit = ouvrir short si pas de position, sinon fermer
      let series;
      {
        const wx = (w - 2) + scrollX;
        const vF = sampleSeries(emaFast, wx);
        const vS = sampleSeries(emaSlow, wx);
        series = (vF >= vS) ? emaFast : emaSlow;
      }

      const vNow = sampleSeries(series, (w - 2) + scrollX);
      if (position) closePosition(vNow);
      else openPosition("short", vNow);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenu);

    /* génération */
    const newCandle = (prevClose, next, regimeNow) => {
      const spread = rand(0.12, 0.38) * volatility * regimeNow;
      const open = clamp01(prevClose);
      const close = clamp01(next + (Math.random() - 0.5) * spread);
      const high = clamp01(Math.max(open, close) + Math.random() * spread * 1.7);
      const low  = clamp01(Math.min(open, close) - Math.random() * spread * 1.7);
      return { o: open, c: close, h: high, l: low };
    };

    // Extents brutes visibles (0..1) — SANS marge ni clamp
    const computeVisibleExtents = () => {
      const segPx = PX(segW);
      const firstIdx = Math.max(0, Math.floor(scrollX / segPx) - 1);
      const lastIdx  = Math.min(candles.length - 1, firstIdx + Math.ceil(w / segPx) + 3);

      let vMin = Infinity, vMax = -Infinity;

      // bougies
      for (let i = firstIdx; i <= lastIdx; i++) {
        const c = candles[i]; if (!c) continue;
        vMin = Math.min(vMin, c.l);
        vMax = Math.max(vMax, c.h);
      }

      // EMA (échantillonnage à l'écran)
      const samples = 24;
      for (let s = 0; s <= samples; s++) {
        const wx = (s / samples) * (w - 1) + scrollX;
        const vf = sampleSeries(emaFast, wx);
        const vs = sampleSeries(emaSlow, wx);
        vMin = Math.min(vMin, vf, vs);
        vMax = Math.max(vMax, vf, vs);
      }

      if (!isFinite(vMin) || !isFinite(vMax)) { vMin = 0.4; vMax = 0.6; }
      return { vMin, vMax };
    };

    const initPoints = () => {
      const segPx = PX(segW);
      const needed = Math.ceil(w / segPx) + 8;

      // base initiale autour de 0.5
      base = new Array(needed).fill(0).map(() => clamp01(0.5 + (Math.random() - 0.5) * volatility));
      emaFast = [base[0]]; emaSlow = [base[0]];
      for (let i = 1; i < base.length; i++) {
        emaFast[i] = emaFast[i - 1] + alphaFast * (base[i] - emaFast[i - 1]);
        emaSlow[i] = emaSlow[i - 1] + alphaSlow * (base[i] - emaSlow[i - 1]);
      }

      candles = [];
      for (let i = 1; i < base.length; i++) candles.push(newCandle(base[i - 1], base[i], 1));
      regime = 1; regimeTarget = 1; vel = 0;
      // initialise la fenêtre verticale sur les données présentes
      const { vMin, vMax } = computeVisibleExtents();
      let span = Math.max(minScaleSpan, (vMax - vMin)) * (1 + scaleMargin * 2);
      const center = (vMin + vMax) / 2;
      domMin = Math.max(0.01, center - span / 2);
      domMax = Math.min(0.99, center + span / 2);
    };

    const pushPoint = () => {
      // switch de régime rare (calme ↔ volatile)
      if (Math.random() < regimeChangeProb) {
        regimeTarget = (regimeTarget === regimeLow ? regimeHigh : regimeLow);
      }
      regime += (regimeTarget - regime) * 0.02; // interpolation lente
      const last = base[base.length - 1];

      // tendance persistante (vel) + bruit
      vel = vel * trendPersistence + (Math.random() - 0.5) * 0.02 * regime;
      let delta = (Math.random() - 0.5) * (volatility * 0.25) * regime   // bruit “normal”
                + vel                                                   // tendance
                + (0.5 - last) * 0.015;                                 // léger recentrage

      // chocs (pump/dump) rares mais marqués
      if (Math.random() < shockProb) {
        delta += (Math.random() < 0.5 ? -1 : 1) * volatility * 0.9 * shockAmp * regime;
      }
      const next = clamp01(last + delta);
      base.push(next); base.shift();
      const lastF = emaFast[emaFast.length - 1];
      const lastS = emaSlow[emaSlow.length - 1];
      emaFast.push(lastF + alphaFast * (next - lastF)); emaFast.shift();
      emaSlow.push(lastS + alphaSlow * (next - lastS)); emaSlow.shift();
      const prevClose = candles.length ? candles[candles.length - 1].c : base[base.length - 2];
      candles.push(newCandle(prevClose, next, regime));
      if (candles.length > base.length - 1) candles.shift();
    };

    const maintainScroll = () => {
      const segPx = PX(segW);
      while (scrollX >= segPx) { scrollX -= segPx; pushPoint(); }
    };

    /* helpers dessin */
    const yPix = (v) => {
      const top = PX(yPadding);
      const bot = h - PX(yPadding);
      const den = Math.max(1e-6, domMax - domMin);
      const t = (v - domMin) / den;
      const clamped = Math.max(0, Math.min(1, t));
      return top + (1 - clamped) * (bot - top);
    };

    const yPixWithDomain = (v, dMin, dMax) => {
      const top = PX(yPadding), bot = h - PX(yPadding);
      const den = Math.max(1e-6, dMax - dMin);
      const t = (v - dMin) / den;
      const clamped = Math.max(0, Math.min(1, t));
      return top + (1 - clamped) * (bot - top);
    };


    const sampleSeries = (arr, worldX) => {
      const segPx = PX(segW);
      const idx = Math.floor(worldX / segPx);
      const t = (worldX % segPx) / segPx;
      const i0 = Math.max(0, Math.min(arr.length - 1, idx));
      const i1 = Math.max(0, Math.min(arr.length - 1, idx + 1));
      return smoothInterp(arr[i0], arr[i1], t);
    };

    const fillUnder = (arr, color) => {
      if (!showFill) return;
      ctx.beginPath();
      const step = Math.max(2, Math.round(2 * DPR));
      for (let x = 0; x < w; x += step) {
        const worldX = x + scrollX;
        const v = sampleSeries(arr, worldX);
        const y = yPix(v);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, toRgba(color, 0.22));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad; ctx.fill();
    };

    const drawEMA = (arr, color) => {
      ctx.beginPath();
      const step = PX(2);
      for (let x = 0; x < w; x += step) {
        const worldX = x + scrollX;
        const v = sampleSeries(arr, worldX);
        const y = yPix(v);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, toRgba(color, 1));
      grad.addColorStop(1, toRgba(color, 0.68));

      ctx.save();
      if (showNeon) { ctx.shadowColor = toRgba(color, 0.7); ctx.shadowBlur = Math.round(neonBlur * DPR); }
      ctx.strokeStyle = grad; ctx.lineWidth = PX(2); ctx.stroke();
      ctx.restore();

      const worldX = (w - 1) + scrollX;
      const v = sampleSeries(arr, worldX);
      const gx = w - PX(2.5), gy = yPix(v), rad = PX(20);
      if (!isFinite(gx) || !isFinite(gy) || !isFinite(rad)) return; // guard
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, glow); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.arc(gx, gy, PX(2), 0, Math.PI * 2); ctx.fill();
    };

    const drawCandles = () => {
      if (!showCandles) return;
      const segPx = PX(segW);
      const gapPx = PX(Math.max(0, barGapPx));
      const bodyW = Math.max(PX(2), Math.min(PX(candleW), segPx - gapPx));
      const half  = Math.round(bodyW / 2);

      const upFill = toRgba(candleUp, bodyAlpha);
      const dnFill = toRgba(candleDown, bodyAlpha);
      const wickUp = toRgba(candleUp, wickAlpha);
      const wickDn = toRgba(candleDown, wickAlpha);

      const firstIdx = Math.max(0, Math.floor(scrollX / segPx) - 1);
      const lastIdx = Math.min(candles.length - 1, firstIdx + Math.ceil(w / segPx) + 3);

      for (let i = firstIdx; i <= lastIdx; i++) {
        const c = candles[i];
        const cx = Math.round((i + 1) * segPx - scrollX);
        const yO = yPix(c.o), yC = yPix(c.c), yH = yPix(c.h), yL = yPix(c.l);
        const isUp = c.c >= c.o;

        ctx.strokeStyle = isUp ? wickUp : wickDn;
        ctx.lineWidth = PX(1);
        ctx.beginPath(); ctx.moveTo(cx, yH); ctx.lineTo(cx, yL); ctx.stroke();

        const top = Math.min(yO, yC), height = Math.max(PX(2), Math.abs(yO - yC));
        ctx.fillStyle = isUp ? upFill : dnFill;
        ctx.fillRect(cx - half, top, half * 2, height);
      }
    };

    const drawEntry = (vEntry, side) => {
      const y = yPix(vEntry);
      ctx.save();
      ctx.setLineDash([PX(6), PX(6)]);
      ctx.lineWidth = PX(1);
      ctx.strokeStyle = side === "long" ? toRgba(pnlUpColor, 0.6) : toRgba(pnlDownColor, 0.6);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.setLineDash([]);
      // petit label
      const lbl = `${side.toUpperCase()} ${vToPrice(vEntry).toFixed(5)}`;
      const tw = ctx.measureText(lbl).width;
      const bx = w - tw - PX(14);
      const by = Math.max(PX(8), Math.min(h - PX(32), y - PX(16)));
      ctx.fillStyle = "rgba(15,23,42,0.92)";
      roundRectPath(ctx, bx - PX(6), by - PX(10), tw + PX(12), PX(24), PX(6)); ctx.fill();
      ctx.fillStyle = "rgba(230,236,255,0.95)";
      ctx.font = `${PX(12)}px ui-sans-serif`;
      ctx.fillText(lbl, bx, by + PX(2));
      ctx.restore();
    };

    const drawPnLBox = (pnl, pips) => {
      const up = pnl >= 0;
      const pad = PX(10), th = PX(44), r = PX(12), bw = PX(220);
      const bx = w - bw - PX(16), by = h - th - PX(16);

      ctx.fillStyle   = "rgba(15,23,42,0.92)";
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth   = PX(1);
      roundRectPath(ctx, bx, by, bw, th, r); ctx.fill(); ctx.stroke();

      const color = up ? pnlUpColor : pnlDownColor;
      const pnlStr  = `${up ? "+" : ""}$${Math.abs(pnl).toFixed(2)}`;
      const pipsStr = `(${up ? "+" : "-"}${Math.abs(pips).toFixed(1)} pips)`;

      ctx.fillStyle = "rgba(230,236,255,0.95)";
      ctx.font = `${PX(14)}px ui-sans-serif`;
      ctx.fillText("PNL", bx + pad, by + PX(18));
      ctx.fillStyle = color;
      ctx.font = `${PX(18)}px ui-sans-serif`;
      ctx.fillText(pnlStr, bx + pad, by + PX(36));
      ctx.fillStyle = "rgba(200,210,235,0.85)";
      ctx.font = `${PX(12)}px ui-sans-serif`;
      const tw = ctx.measureText(pnlStr).width;
      ctx.fillText(pipsStr, bx + pad + tw + PX(10), by + PX(36));

      // ligne equity petite
      ctx.fillStyle = "rgba(200,210,235,0.75)";
      ctx.font = `${PX(11)}px ui-sans-serif`;
      ctx.fillText(`Equity: $${equity.toFixed(2)}`, bx + bw - pad - PX(110), by + PX(18));
    };


    /* loop */
    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min(50, ts - lastTs); lastTs = ts;
      ctx.clearRect(0, 0, w, h);

      if (!prefersReduced) {
        scrollX += (speedPx * (dt / 1000)) * DPR;
        maintainScroll();
      }
      if (autoScale) {
        const { vMin, vMax } = computeVisibleExtents();

        // span cible (marge + minimum)
        let span = Math.max(minScaleSpan, (vMax - vMin));
        span *= (1 + scaleMargin * 2);

        // série “au-dessus” à droite
        let series;
        {
          const wx = (w - 2) + scrollX;
          const vF = sampleSeries(emaFast, wx);
          const vS = sampleSeries(emaSlow, wx);
          series = (vF >= vS) ? emaFast : emaSlow;
        }

        const vLast = sampleSeries(series, (w - 2) + scrollX);

        // domaine cible : follow-anchor
        const p = Math.max(0.10, Math.min(0.90, anchorPos));
        let targetMin = vLast - (1 - p) * span;
        let targetMax = targetMin + span;

        // garde la fenêtre dans [0..1]
        const eps = 0.001;
        if (targetMin < eps) { targetMax += (eps - targetMin); targetMin = eps; }
        if (targetMax > 1 - eps) { targetMin -= (targetMax - (1 - eps)); targetMax = 1 - eps; }
        if (targetMax - targetMin < minScaleSpan) {
          const mid = (targetMin + targetMax) / 2;
          targetMin = mid - minScaleSpan / 2;
          targetMax = mid + minScaleSpan / 2;
        }

        // --- EDGE GUARD ---
        // si le dernier prix est trop proche d'un bord dans le domaine ACTUEL,
        // on rattrape agressivement vers le domaine cible
        const topSafe = PX(yPadding) + PX(edgeGuardPx);
        const botSafe = (h - PX(yPadding)) - PX(edgeGuardPx);
        const yCur = yPixWithDomain(vLast, domMin, domMax);

        const fast = edgeGuard && (yCur < topSafe || yCur > botSafe);
        const s = fast ? Math.min(1, Math.max(0, edgeSnap)) : scaleSmoothing;

        domMin += (targetMin - domMin) * s;
        domMax += (targetMax - domMax) * s;

        // sécurité inversion
        if (domMax - domMin < 1e-5) {
          const mid = (domMin + domMax) / 2;
          domMin = mid - 5e-6; domMax = mid + 5e-6;
        }
      }

      // série suivie (même logique que pour l'ancre/auto-scale)
      let series;
      {
        const wx = (w - 2) + scrollX;
        const vF = sampleSeries(emaFast, wx);
        const vS = sampleSeries(emaSlow, wx);
        series = (vF >= vS) ? emaFast : emaSlow;
      }
      const vLast = sampleSeries(series, (w - 2) + scrollX);
      const curPrice = vToPrice(vLast);

      // PnL courant (si position)
      let pnlNow = 0, pipsNow = 0;
      if (position) {
        const sign = position.side === "long" ? 1 : -1;
        const diffPips = (curPrice - position.entryPrice) * pipFactor * sign;
        pnlNow  = diffPips * pipValue * position.size;
        pipsNow = diffPips;
      } else if (showPnLDemo) {
        // petit PnL “demo” qui suit doucement la pente de l’EMA
        pnlNow = Math.sin(performance.now() * 0.001) * 200; // ±200$
        pipsNow = pnlNow / (pipValue * Math.max(1, positionSize));
      }

      // lissage visuel du PnL
      dispPnL += (pnlNow - dispPnL) * pnlSmooth;




      drawPillars(ts);
      drawSparks(dt);
      if (showCandles) drawCandles();
      fillUnder(emaFast, fillFastColor);
      drawEMA(emaSlow, lineSlow);
      drawEMA(emaFast, lineFast);
     if (showPnLOverlay) {
      if (position) drawEntry(position.entryV, position.side);
      drawPnLBox(dispPnL + realized, pipsNow);

     }
    };

    /* init */
    resize();
    window.addEventListener("resize", resize);
    loop(performance.now());

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [
    speedPx, segW, volatility, yPadding,
    emaFastPeriod, emaSlowPeriod, lineFast, lineSlow, glow,
    showCandles, candleW, barGapPx, candleUp, candleDown, wickAlpha, bodyAlpha,
    showFill, fillFastColor, showNeon, neonBlur, showPillars, pillarCount, pillarColor,
    showSparks, sparkCount, sparkColor,autoScale, scaleMargin, scaleSmoothing, minScaleSpan,
    followAnchor, anchorPos, edgeGuard, edgeGuardPx, edgeSnap,
    interactiveTrading, showPnLDemo, accountStart, positionSize,
    pipValue, pipFactor, priceBase, priceRange, pnlSmooth, pnlUpColor, pnlDownColor
      ]);

    return (
    <div className="market-canvas-skin">
      <canvas ref={canvasRef} className="market-canvas" aria-hidden="true" />
    </div>
  );

}

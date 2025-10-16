// [v1.3 - retouche design] Fond hex animé : lueur dans les interstices uniquement
import { useEffect, useRef } from "react";

export default function HexNeonBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const cvs = ref.current; // canvas déjà dans le DOM

    // ============================================================
    // [v1.3.3]  Fallback intelligent + mode "lite"
    // ------------------------------------------------------------
    // - Si le canvas échoue → on garde fond noir statique
    // - Si appareil à faible mémoire (≤2 Go) → désactivation auto
    // ============================================================

    // Détection device faible
    const lowPerfDevice = navigator.deviceMemory && navigator.deviceMemory <= 2;
    if (lowPerfDevice) {
      document.body.classList.add("lite-mode");
      console.warn("Mode lite activé (RAM ≤2 Go)");
      return; // on ne lance pas l'animation
    }

    let ctx;
    try {
      ctx = cvs.getContext("2d");
    } catch (err) {
      console.warn("Canvas non supporté, fallback statique appliqué.", err);
      document.body.classList.add("no-hex");
      return;
    }
    // --- init animation complète
    let DPR, W, H, a, gap, mask, mctx, glow, gctx, edges = [], raf = 0;
    let blobs = [];

    const css = () => getComputedStyle(document.body);
    const val = (k, d) => parseFloat(css().getPropertyValue(k)) || d;

    function build() {
      DPR = Math.max(1, window.devicePixelRatio || 1);
      // [v1.3] taille = viewport (fond "vrai background" qui suit le scroll)
      W = (cvs.width  = Math.floor(innerWidth  * DPR));
      H = (cvs.height = Math.floor(innerHeight * DPR));
      cvs.style.width  = innerWidth  + "px";
      cvs.style.height = innerHeight + "px";

      a = val("--hex-edge", 80);
      gap = val("--hex-gap", 3);

      // masque = traits des hex (interstices)
      mask = document.createElement("canvas"); mask.width = W; mask.height = H;
      mctx = mask.getContext("2d"); mctx.clearRect(0,0,W,H);
      mctx.lineWidth = gap * DPR; mctx.strokeStyle = "#000"; mctx.lineJoin = "round"; // interstices noir profond

      const wHex = 2 * a, hHex = Math.sqrt(3) * a, xs = 1.5 * a, ys = hHex;
      const cols = Math.ceil((innerWidth + 4*wHex)/xs)+2, rows = Math.ceil((innerHeight + 4*hHex)/ys)+2;

      edges = [];
      const seen = new Set();
      for (let c=-2;c<cols;c++){
        const cx = (-wHex + c*xs) * DPR;
        const oy = (c%2? hHex/2:0);
        for (let r=0;r<rows;r++){
          const cy = (-hHex + oy + r*ys) * DPR;
          const pts = Array.from({length:6}, (_,i)=> {
            const ang = (Math.PI/180)*(60*i); 
            return {x: cx + a*DPR*Math.cos(ang), y: cy + a*DPR*Math.sin(ang)};
          });
          mctx.beginPath();
          pts.forEach((p,i)=> i? mctx.lineTo(p.x,p.y): mctx.moveTo(p.x,p.y));
          mctx.closePath(); mctx.stroke();

          for(let i=0;i<6;i++){
            const p1=pts[i], p2=pts[(i+1)%6];
            const k=`${p1.x|0}_${p1.y|0}_${p2.x|0}_${p2.y|0}`, k2=`${p2.x|0}_${p2.y|0}_${p1.x|0}_${p1.y|0}`;
            if(seen.has(k)||seen.has(k2)) continue; seen.add(k);
            edges.push({x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,len:Math.hypot(p2.x-p1.x,p2.y-p1.y)});
          }
        }
      }

      glow = document.createElement("canvas"); glow.width=W; glow.height=H;
      gctx = glow.getContext("2d");
      initBlobs();                                // [v1.3] ellipses, pas de runners
    }

    function initBlobs(){
      const R = Math.max(W,H);
      // 3 ellipses : centre très bright, bord qui s’éteint
      blobs = [
        // diag ↘︎
        { x: W*0.25, y: H*0.35, rx: R*0.28, ry: R*0.18, vx:  0.065, vy:  0.032, ph: 0.0  },
        // diag ↗︎
        { x: W*0.78, y: H*0.62, rx: R*0.24, ry: R*0.16, vx: -0.058, vy: -0.026, ph: 1.1 },
        // diag ↖︎
        { x: W*0.52, y: H*0.22, rx: R*0.22, ry: R*0.14, vx: -0.030, vy:  0.052, ph: 2.3 },
        // diag ↙︎  (nouvelle ellipse)
        { x: W*0.12, y: H*0.78, rx: R*0.26, ry: R*0.16, vx:  0.042, vy: -0.055, ph: 3.4 },
      ];
    }
    

    function drawBlob(b){
      const hue = 210; // bleu nuit signature
      gctx.save();
      gctx.translate(b.x, b.y);
      gctx.scale(b.rx, b.ry);             // ellipse via scale
      // ⚠️ dégradé créé APRÈS la transform → suit bien l’ellipse
      const grd = gctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      // [v1.3] palette "bleu nuit" : centre flashy (mais pas cyan), bord très profond
      const deepHue = 220; // un poil plus "nuit" que 210
      grd.addColorStop(0.00, `hsla(${deepHue},100%,54%,.96)`);  // centre bleu nuit flashy
      grd.addColorStop(0.22, `hsla(${deepHue},95%,46%,.68)`);   // cœur riche, pas de blanchiment
      grd.addColorStop(0.55, `hsla(${deepHue},85%,30%,.38)`);   // transition sombre
      grd.addColorStop(1.00, `hsla(${deepHue},80%,16%,.10)`);   // bord bleu nuit très profond
      gctx.fillStyle = grd;
      gctx.beginPath(); gctx.arc(0,0,1,0,Math.PI*2); gctx.fill();
      gctx.restore();
    }



    function frame(t){
      const now = performance.now(); const dt = Math.min(32, now-(frame._||now)); frame._=now;
      // === couche 1 : FOND NOIR profond (base du site) ===
      ctx.setTransform(1,0,0,1,0,0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#05070a";           // noir profond
      ctx.fillRect(0,0,W,H);

      // === couche 2 : ELLIPSES BLEUES (sous la grille) ===
      gctx.clearRect(0,0,W,H);
      // anim : dérive lente + léger “pulse”
      for(const b of blobs){
        b.x += b.vx * dt; b.y += b.vy * dt; b.ph += 0.0015*dt;
        const kx = 1 + 0.06*Math.sin(b.ph);
        const ky = 1 + 0.06*Math.cos(b.ph*1.2);
        b._rx = b.rx*kx; b._ry = b.ry*ky;
        // wrap discret
        if (b.x < -b.rx) b.x = W + b.rx; if (b.x > W + b.rx) b.x = -b.rx;
        if (b.y < -b.ry) b.y = H + b.ry; if (b.y > H + b.ry) b.y = -b.ry;
      }
      gctx.filter = `blur(${2.2*DPR}px)`;               // halo doux
      for(const b of blobs) drawBlob({ ...b, rx:(b._rx||b.rx), ry:(b._ry||b.ry) });
      gctx.filter = "none";

      // on ne garde la lumière que dans les interstices
      gctx.globalCompositeOperation="destination-in";
      gctx.drawImage(mask,0,0);
      gctx.globalCompositeOperation="source-over";
      
      // === couche 3 : GRILLE (interstices noirs + léger bevel 3D) ===
      ctx.drawImage(mask,0,0);                         // edges path
      ctx.globalAlpha=1; ctx.globalCompositeOperation="source-in";
      ctx.fillStyle="#000";                             // interstices noirs
      ctx.fillRect(0,0,W,H);
      // relief : liseré soft (direction lumière diagonale)
      ctx.globalCompositeOperation="source-over";
      ctx.filter = `blur(${0.8*DPR}px)`;
      ctx.globalAlpha = 0.22;
      ctx.drawImage(mask, 1.2*DPR, 1.2*DPR);           // ombre interne légère      
      ctx.filter = "none"; ctx.globalAlpha = 1;

      // === couche 4 : LUEUR BLEUE (les ellipses, derrière la grille) ===
      ctx.globalCompositeOperation="lighter";
      ctx.drawImage(glow,0,0);

      raf = requestAnimationFrame(frame);
    }

    const onResize = () => build();
    window.addEventListener("resize", onResize);
    build(); raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      // on ne retire pas le canvas : il fait partie du layout
    };
  }, []);

  return <canvas id="hex-canvas" ref={ref} />;
}

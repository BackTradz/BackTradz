import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Select.css";
// ["A","B"] ou [{ value, label }]
function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((opt) =>
    typeof opt === "string"
      ? { value: opt, label: opt }
      : { value: opt.value, label: opt.label ?? String(opt.value) }
  );
}

const sizeClass = { sm: "strt--sm", md: "strt--md", lg: "strt--lg" };

export default function Select({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Sélectionner…",
  disabled = false,
  size = "md",                 // sm | md | lg
  variant = "solid",           // solid | outline
  fullWidth = false,
  className = "",
  zStack = "local",              // 🆕 "local" | "global"
}) {
  const opts = useMemo(() => normalizeOptions(options), [options]);
  const selected = opts.find(o => o.value === value) || null;

  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(Math.max(0, opts.findIndex(o => o.value === value)));
  const [panelPos, setPanelPos] = useState({ left: 0, top: 0, width: 0 });
  const rootRef = useRef(null);
  const btnRef  = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);


  //----- select global passe au dessus de tout (Z-index)
useEffect(() => {
  if (!open || zStack !== "global") return;

    function place() {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;

      const vw = window.innerWidth || document.documentElement.clientWidth;
      const margin = 8;
      const width = r.width;

      // clamp horizontal pour ne pas dépasser à droite
      let left = r.left;
      if (left + width > vw - margin) {
        left = Math.max(margin, vw - width - margin);
      }

      setPanelPos({ left, top: r.bottom + 8, width });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, zStack]);


  // ---- détecte un vrai pointeur fin (desktop/souris) ----
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: fine)");
    const set = () => setIsDesktop(!!mq?.matches);
    set();
    mq?.addEventListener?.("change", set);
    return () => mq?.removeEventListener?.("change", set);
  }, []);

  // ---- outside click + esc ----
  useEffect(() => {
    function onDoc(e) {
      const t = e.target;
      // clic sur le bouton / wrapper
      if (rootRef.current?.contains(t)) return;
      // 🆕 en mode portal, clic dans le panneau => ne pas fermer
      if (zStack === "global" && panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e){ if(e.key === "Escape") setOpen(false); }

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [zStack]);


  // Focus l’item en vue à l’ouverture
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-idx="${hi}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, hi]);

  function commit(val){
    onChange?.(val);
    setOpen(false);
    btnRef.current?.focus();
  }

  function onKeyDown(e){
    if(!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")){
      e.preventDefault(); setOpen(true); return;
    }
    if(!open) return;
    if(e.key === "ArrowDown"){ e.preventDefault(); setHi(i => Math.min(opts.length-1, i+1)); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); setHi(i => Math.max(0, i-1)); }
    else if(e.key === "Home"){ e.preventDefault(); setHi(0); }
    else if(e.key === "End"){ e.preventDefault(); setHi(opts.length-1); }
    else if(e.key === "Enter"){ e.preventDefault(); const o = opts[hi]; if(o) commit(o.value); }
  }

  // ---- fermeture auto quand la souris QUITTE le composant (desktop only) ----
    const hoverCloseTimer = useRef(null);
    function scheduleHoverClose() {
    if (!isDesktop || !open) return;
    clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = setTimeout(() => setOpen(false), 120); // ferme même si le bouton a le focus
    }
    function cancelHoverClose(){
    clearTimeout(hoverCloseTimer.current);
    }


   return (
    <div
      ref={rootRef}
      className={[
          "strt-select",
          sizeClass[size] ?? sizeClass.md,
        variant === "outline" ? "strt--outline" : "strt--solid",
        fullWidth ? "strt--full" : "",
        className,
      ].join(" ")}
      data-open={open ? "true" : "false"}
      style={open ? { zIndex: 4000 } : undefined}
      onMouseLeave={scheduleHoverClose}   // desktop: si tu sors du menu -> fermeture douce
      onMouseEnter={cancelHoverClose}
    >
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      <button
        id={id}
        ref={btnRef}
        type="button"
        className="strt-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        onClick={() => !disabled && setOpen(v => !v)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span className={`strt-label ${!selected ? "is-placeholder" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="strt-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
      zStack === "global"
        ? createPortal(
            <div
              className="strt-panel"
              ref={panelRef}   
              role="presentation"
              style={{
                position: "fixed",
                left: panelPos.left,
                top: panelPos.top,
                width: panelPos.width,          // largeur = bouton
                minWidth: panelPos.width,       // override du min-width:100% global
                maxWidth: panelPos.width,
                right: "auto",                  // neutralise tout right:0 éventuel
                boxSizing: "border-box",
                zIndex: 100000,
              }}

              onMouseLeave={scheduleHoverClose}
              onMouseEnter={cancelHoverClose}
            >
              <ul
                id={`${id}-listbox`}
                ref={listRef}
                role="listbox"
                aria-labelledby={id}
                className="strt-list"
                onMouseDown={(e) => e.preventDefault()}
              >
                {opts.map((o, i) => {
                  const isSel = o.value === value;
                  const isHi  = i === hi;
                  return (
                    <li
                      key={o.value}
                      data-idx={i}
                      role="option"
                      aria-selected={isSel}
                      className={[
                        "strt-item",
                        isSel ? "is-selected" : "",
                        isHi  ? "is-highlighted" : "",
                      ].join(" ")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(o.value)}
                    >
                      <span className="strt-text">{o.label}</span>
                      {isSel && <span className="strt-tick" aria-hidden="true">✓</span>}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body
          )
        : (
            <div
              className="strt-panel"
              role="presentation"
              onMouseLeave={scheduleHoverClose}
              onMouseEnter={cancelHoverClose}
            >
              <ul
                id={`${id}-listbox`}
                ref={listRef}
                role="listbox"
                aria-labelledby={id}
                className="strt-list"
                onMouseDown={(e) => e.preventDefault()}
              >
                {opts.map((o, i) => {
                  const isSel = o.value === value;
                  const isHi  = i === hi;
                  return (
                    <li
                      key={o.value}
                      data-idx={i}
                      role="option"
                      aria-selected={isSel}
                      className={[
                        "strt-item",
                        isSel ? "is-selected" : "",
                        isHi  ? "is-highlighted" : "",
                      ].join(" ")}
                      onMouseDown={(e) => { e.preventDefault(); commit(o.value); }}  // 🆕 valider avant fermeture
                    >
                      <span className="strt-text">{o.label}</span>
                      {isSel && <span className="strt-tick" aria-hidden="true">✓</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
    )}
    </div>
  );
}

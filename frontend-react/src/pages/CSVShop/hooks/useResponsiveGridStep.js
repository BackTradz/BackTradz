// src/pages/csvshop/hooks/useResponsiveGridStep.js
// ======================================================================
// Hook responsive pour la pagination visuelle de la grille CSVShop.
// - Desktop : 16 items ; Mobile (≤ 640px) : 10 items
// - Expose initialStepRef, visibleCount, setVisibleCount
// ======================================================================
import { useEffect, useRef, useState } from "react";

export default function useResponsiveGridStep() {
  const initialStepRef = useRef(16);
  const [visibleCount, setVisibleCount] = useState(initialStepRef.current);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => {
      const step = mq.matches ? 10 : 16;
      initialStepRef.current = step;
      setVisibleCount(step);
    };
    apply(); // init
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return { initialStepRef, visibleCount, setVisibleCount };
}

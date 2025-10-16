// [CHANGE: 2025-09-04] Front-only labels pour STRATÉGIES (clé backend -> libellé UX + description)


// src/config/labels/strategies.map.js
// Front-only labels pour STRATÉGIES (clé backend -> libellé UX concis + description courte)
// ⚠️ Ne rien déduire côté UX : tout est calé sur la logique des scripts.

const STRATEGIES_MAP = {
  // ========== OB PULLBACK (PUR) ==========
  ob_pullback_pure: {
    label: "OB (pur) + Pullback",
    short: "Retour dans OB (sans gap)",
    description: "OB simple : entrée au retour du prix dans la zone, après délai mini.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      min_overlap_ratio: "Profondeur min retour (%)", // ⬅️ NEW
    },
  },
  ob_pullback_pure_ema_simple: {
    label: "OB (pur) + Pullback + EMA",
    short: "Retour dans OB + Close vs EMA",
    description: "OB simple + filtre EMA (Close >/< EMA) au moment de l’entrée.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_key: "EMA (colonne)",
       min_overlap_ratio: "Profondeur min retour (%)", // ⬅️ NEW
    },
  },
  ob_pullback_pure_rsi: {
    label: "OB (pur) + Pullback + RSI",
    short: "Retour dans OB + RSI",
    description: "OB simple + filtre RSI (buy < seuil, sell > 100 - seuil).",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      rsi_threshold: "Seuil RSI",
       min_overlap_ratio: "Profondeur min retour (%)", // ⬅️ NEW
    },
  },
  ob_pullback_pure_ema_simple_rsi: {
    label: "OB (pur) + EMA + RSI",
    short: "Close vs EMA + RSI",
    description: "OB simple + Close vs EMA + RSI (double filtre) à l’entrée.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_key: "EMA (colonne)",
      rsi_threshold: "Seuil RSI",
       min_overlap_ratio: "Profondeur min retour (%)", // ⬅️ NEW
    },
  },
  ob_pullback_pure_tendance_ema: {
    label: "OB (pur) + Tendance EMA",
    short: "Retour dans OB + EMA trend",
    description: "OB simple + tendance EMA (ema_fast vs ema_slow) au moment de l’entrée.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
       min_overlap_ratio: "Profondeur min retour (%)", // ⬅️ NEW
    },
  },
  ob_pullback_pure_tendance_ema_rsi: {
    label: "OB (pur) + Tendance EMA + RSI",
    short: "EMA trend + RSI",
    description: "OB simple + tendance EMA + RSI (triple condition) à l’entrée.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
      rsi_threshold: "Seuil RSI",
       min_overlap_ratio: "Profondeur min retour (%)", // ⬅️ NEW
    },
  },

  // ========== OB PULLBACK (GAP) ==========
  ob_pullback_gap: {
    label: "OB (gap) + Pullback",
    short: "OB validé par gap",
    description: "OB* validé par gap immédiat, entrée au retour dans l’OB.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  ob_pullback_gap_ema_simple: {
    label: "OB (gap) + EMA",
    short: "OB* + Close vs EMA",
    description: "OB* (gap) + filtre EMA (Close >/< EMA) à l’entrée.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_key: "EMA (colonne)",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  ob_pullback_gap_rsi: {
    label: "OB (gap) + RSI",
    short: "OB* + RSI",
    description: "OB* (gap) + filtre RSI (buy < seuil, sell > 100 - seuil).",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      rsi_threshold: "Seuil RSI",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  ob_pullback_gap_tendance_ema: {
    label: "OB (gap) + Tendance EMA",
    short: "OB* + EMA trend",
    description: "OB* (gap) + tendance EMA (ema_fast vs ema_slow) à l’entrée.",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  ob_pullback_gap_ema_rsi: {
    label: "OB (gap) + EMA + RSI",
    short: "OB* + EMA trend + RSI",
    description: "OB* (gap) + tendance EMA + RSI (conditions combinées).",
    paramsOverride: {
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      allow_multiple_entries: "Entrées multiples",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
      rsi_threshold: "Seuil RSI",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },

  // ========== FVG PULLBACK ==========
  fvg_pullback_multi: {
    label: "FVG + Pullback",
    short: "FVG multi + retours",
    description: "FVG actives en parallèle, entrée au retour (limite d’attente/touches).",
    paramsOverride: {
      min_pips: "Taille min FVG (pips)",
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      max_touch: "Retours max",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  fvg_pullback_multi_ema: {
    label: "FVG + Pullback + EMA",
    short: "FVG + Close vs EMA",
    description: "Retour validé si Close >/< EMA (selon sens).",
    paramsOverride: {
      min_pips: "Taille min FVG (pips)",
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      max_touch: "Retours max",
      ema_key: "EMA (colonne)",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  fvg_pullback_multi_rsi: {
    label: "FVG + Pullback + RSI",
    short: "FVG + RSI",
    description: "Retour validé si RSI < seuil (buy) ou > 100 - seuil (sell).",
    paramsOverride: {
      min_pips: "Taille min FVG (pips)",
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      max_touch: "Retours max",
      rsi_threshold: "Seuil RSI",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  fvg_pullback_tendance_ema: {
    label: "FVG + Pullback + Tendance EMA",
    short: "FVG + EMA trend",
    description: "Retour validé si ema_fast >/< ema_slow (selon sens).",
    paramsOverride: {
      min_pips: "Taille min FVG (pips)",
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      max_touch: "Retours max",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  fvg_pullback_tendance_ema_rsi: {
    label: "FVG + Pullback + EMA + RSI",
    short: "FVG + EMA trend + RSI",
    description: "Retour validé si tendance EMA + RSI (conditions combinées).",
    paramsOverride: {
      min_pips: "Taille min FVG (pips)",
      min_wait_candles: "Bougies d’attente",
      max_wait_candles: "Expiration (bougies)",
      max_touch: "Retours max",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
      rsi_threshold: "Seuil RSI",
      min_overlap_ratio: "Profondeur min retour (%)",
    },
  },
  // ========== FVG IMPULSIVE ==========
    fvg_impulsive: {
      label: "FVG impulsive",
      short: "FVG impulsive (3 bougies)",
      description: "Détection d’un Fair Value Gap impulsif (3 bougies). Entrée sur la bougie de signal ou après confirmation.",
      paramsOverride: {
        min_pips: "Taille min FVG (pips)",
        confirm_candle: "Bougie de confirmation",
      },
    },
    fvg_impulsive_ema: {
      label: "FVG impulsive + EMA",
      short: "FVG impulsive + EMA trend",
      description: "FVG impulsive filtrée par tendance EMA (ema_fast vs ema_slow).",
      paramsOverride: {
        min_pips: "Taille min FVG (pips)",
        confirm_candle: "Bougie de confirmation",
        ema_fast: "EMA rapide",
        ema_slow: "EMA lente",
      },
    },
    fvg_impulsive_rsi: {
      label: "FVG impulsive + RSI",
      short: "FVG impulsive + RSI",
      description: "FVG impulsive filtrée par RSI global (buy < seuil, sell > 100 - seuil).",
      paramsOverride: {
        min_pips: "Taille min FVG (pips)",
        confirm_candle: "Bougie de confirmation",
        rsi_threshold: "Seuil RSI",
      },
    },
    fvg_impulsive_rsi_ema: {
      label: "FVG impulsive + RSI + EMA",
      short: "FVG impulsive + EMA trend + RSI",
      description: "FVG impulsive avec double filtre : tendance EMA (ema_fast vs ema_slow) + RSI.",
      paramsOverride: {
        min_pips: "Taille min FVG (pips)",
        confirm_candle: "Bougie de confirmation",
        rsi_threshold: "Seuil RSI",
        ema_fast: "EMA rapide",
        ema_slow: "EMA lente",
      },
    },


  // ========== ENGLOBANTE ==========
  englobante_entry: {
    label: "Englobante",
    short: "Pattern 3 bougies",
    description: "Englobante (3 bougies) : entrée sur la bougie après une englobante confirmée.",
    paramsOverride: {},
  },
  englobante_entry_ema: {
    label: "Englobante + Tendance EMA",
    short: "Englobante + EMA trend",
    description: "Englobante confirmée + filtre de tendance EMA.",
    paramsOverride: {
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
    },
  },
  englobante_entry_rsi: {
    label: "Englobante + RSI",
    short: "Englobante + RSI",
    description: "Englobante confirmée + filtre RSI (buy < seuil, sell > 100 - seuil).",
    paramsOverride: {
      rsi_threshold: "Seuil RSI",
    },
  },
  englobante_entry_rsi_ema: {
    label: "Englobante + RSI + EMA",
    short: "Englobante + EMA trend + RSI",
    description: "Englobante confirmée + tendance EMA + filtre RSI.",
    paramsOverride: {
      rsi_threshold: "Seuil RSI",
      ema_fast: "EMA rapide",
      ema_slow: "EMA lente",
    },
  },

  // 🔧 Ajoute ici tes futures strats sans toucher au backend
  // "ma_nouvelle_strat": { label: "...", short: "...", description: "...", paramsOverride: {...} }
};

export default STRATEGIES_MAP;



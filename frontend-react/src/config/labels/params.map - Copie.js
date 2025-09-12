// src/config/labels/params.map.js
// Front-only labels génériques pour PARAMÈTRES — aligné sur les noms attendus
// par les stratégies (runner passera ces clés telles quelles).

const PARAMS_MAP = {
  // --- Communs FVG/OB ---
  min_pips: {
    label: "Taille minimale (pips)",
    help: "Seuil minimal en pips (converti automatiquement selon la paire).",
    type: "number",
    min: 0
  },
  min_wait_candles: {
    label: "Bougies min avant entrée",
    help: "Nombre minimum de bougies à attendre.",
    type: "number",
    min: 0
  },
  max_wait_candles: {
    label: "Bougies max avant invalidation",
    help: "Nombre maximum de bougies avant d'invalider la zone.",
    type: "number",
    min: 0
  },
  max_touch: {
    label: "Touches max de la zone",
    help: "Nombre maximal de retours sur la zone avant invalidation.",
    type: "number",
    min: 0
  },

  // --- EMA / RSI (selon strat) ---
  ema_key: {
    label: "EMA (clé unique)",
    help: "Nom de la colonne EMA (ex: EMA_50) — pour strats à 1 EMA.",
    type: "text",
    placeholder: "EMA_50"
  },
  ema_fast: {
    label: "EMA rapide",
    help: "Nom de la colonne EMA rapide (ex: EMA_50).",
    type: "text",
    placeholder: "EMA_50"
  },
  ema_slow: {
    label: "EMA lente",
    help: "Nom de la colonne EMA lente (ex: EMA_200).",
    type: "text",
    placeholder: "EMA_200"
  },
  rsi_key: {
    label: "RSI (colonne)",
    help: "Nom de la colonne RSI (ex: RSI).",
    type: "text",
    placeholder: "RSI"
  },
  rsi_threshold: {
    label: "Seuil RSI",
    help: "Seuil RSI pour la validation (0–100).",
    type: "number",
    min: 0, max: 100
  },

  // --- Comportement zones / confirmations ---
  allow_multiple_entries: {
    label: "Plusieurs entrées sur la zone",
    help: "Autoriser plusieurs entrées sur la même zone.",
    type: "boolean",
    default: false
  },
  confirm_candle: {
    label: "Bougie de confirmation",
    help: "Exiger une bougie de confirmation avant l'entrée.",
    type: "boolean",
    default: false
  },

  // --- Variantes RSI borne-borne (si besoin) ---
  rsi_min: {
    label: "RSI minimum",
    help: "Filtre RSI plancher.",
    type: "number",
    min: 0, max: 100
  },
  rsi_max: {
    label: "RSI maximum",
    help: "Filtre RSI plafond.",
    type: "number",
    min: 0, max: 100
  },

  // --- Time key (certaines strats) ---
  time_key: {
    label: "Colonne temps",
    help: "Nom de la colonne timestamp. Laisse 'time' par défaut.",
    type: "text",
    placeholder: "time",
    default: "time"
  },
};

export default PARAMS_MAP;

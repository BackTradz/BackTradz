// src/config/docs/strategies.docs.js
// ➜ Une entrée par stratégie (clé backend) avec 3 blocs simples:
//    summary: string
//    entry:   string[]
//    params:  { name: string, desc: string }[]

const STRATEGY_DOCS = {
// ------------------- ENGLOBANTE (famille) -------------------
englobante_entry: {
  summary: "Stratégie d’englobante en 3 bougies. Détection d’une bougie englobante suivie d’une confirmation immédiate dans le même sens.",
  entry: [
    "Détecter un motif de 3 bougies formant une englobante (la 2ᵉ bougie englobe la 1ʳᵉ).",
    "Pour un signal haussier : la 2ᵉ bougie a un plus bas inférieur et un plus haut supérieur à la 1ʳᵉ ; la 3ᵉ bougie casse au-dessus du plus haut de la 2ᵉ.",
    "Pour un signal baissier : la 2ᵉ bougie a un plus haut supérieur et un plus bas inférieur à la 1ʳᵉ ; la 3ᵉ bougie casse sous le plus bas de la 2ᵉ.",
    "Entrée immédiate à l’ouverture de la 4ᵉ bougie (après la confirmation).",
  ],
  params: [
    // Pas de paramètres spécifiques dans le code.
  ],
},

englobante_entry_ema: {
  summary: "Stratégie Englobante (3 bougies) avec filtre de tendance basé sur deux moyennes mobiles exponentielles (EMA).",
  entry: [
    "Détecter un motif d’englobante (3 bougies) comme dans la version de base.",
    "Pour un signal haussier : conditions de l’englobante haussière + EMA rapide (ema_fast) au-dessus de l’EMA lente (ema_slow).",
    "Pour un signal baissier : conditions de l’englobante baissière + EMA rapide (ema_fast) en dessous de l’EMA lente (ema_slow).",
    "Entrée à la cassure de la 3ᵉ bougie, confirmée par la tendance EMA.",
  ],
  params: [
    { name: "ema_fast", desc: "Période de l’EMA rapide (par défaut 50)." },
    { name: "ema_slow", desc: "Période de l’EMA lente (par défaut 200)." },
  ],
},

englobante_entry_rsi: {
  summary: "Stratégie Englobante (3 bougies) avec filtre de momentum basé sur l’indicateur RSI.",
  entry: [
    "Détecter un motif d’englobante (3 bougies) comme dans la version de base.",
    "Pour un signal haussier : conditions de l’englobante haussière + RSI < seuil défini (signal d’excès de baisse).",
    "Pour un signal baissier : conditions de l’englobante baissière + RSI > (100 - seuil) (signal d’excès de hausse).",
    "Entrée à la cassure de la 3ᵉ bougie, uniquement si le filtre RSI est validé.",
  ],
  params: [
    { name: "rsi_threshold", desc: "Seuil RSI utilisé pour filtrer les signaux (par défaut 50)." },
  ],
},

englobante_entry_rsi_ema: {
  summary: "Stratégie Englobante (3 bougies) combinant filtre RSI et filtre de tendance EMA (ema_fast/ema_slow).",
  entry: [
    "Détecter un motif d’englobante (3 bougies).",
    "Pour un signal haussier : englobante haussière + RSI < seuil choisi + EMA rapide (ema_fast) au-dessus de l’EMA lente (ema_slow).",
    "Pour un signal baissier : englobante baissière + RSI > (100 - seuil) + EMA rapide (ema_fast) en dessous de l’EMA lente (ema_slow).",
    "Entrée sur la cassure de la 3ᵉ bougie, uniquement si les deux filtres (RSI + EMA) confirment.",
  ],
  params: [
    { name: "rsi_threshold", desc: "Seuil RSI utilisé comme filtre de momentum (par défaut 50)." },
    { name: "ema_fast",      desc: "Période de l’EMA rapide (par défaut 50)." },
    { name: "ema_slow",      desc: "Période de l’EMA lente (par défaut 200)." },
  ],
},

// ------------------- FVG IMPULSIVE (famille) -------------------

fvg_impulsive: {
  summary: "Détection d’un Fair Value Gap impulsif (3 bougies). Le signal apparaît lorsqu’un écart net (gap) se crée entre la bougie n-2 et la bougie n.",
  entry: [
    "Identifier un FVG impulsif : comparer la bougie n-2 et la bougie n.",
    "Signal haussier : le plus bas de la bougie n est supérieur au plus haut de la bougie n-2 (gap haussier).",
    "Signal baissier : le plus haut de la bougie n est inférieur au plus bas de la bougie n-2 (gap baissier).",
    "Optionnel : attendre une bougie de confirmation (`confirm_candle=true`) avant d’entrer.",
    "Entrée prise à la clôture de la bougie de signal (ou après la bougie de confirmation)."
  ],
  params: [
    { name: "min_pips",       desc: "Distance minimale du gap (exprimée directement en unités de prix)." },
    { name: "confirm_candle", desc: "Si vrai, exige une bougie de confirmation après la détection du gap." }
  ],
},

fvg_impulsive_ema: {
  summary: "FVG impulsif (3 bougies) filtré par tendance EMA (ema_fast/ema_slow).",
  entry: [
    "Détecter un FVG impulsif (gap haussier ou baissier entre n-2 et n).",
    "Signal haussier : gap haussier valide + EMA rapide (ema_fast) au-dessus de l’EMA lente (ema_slow).",
    "Signal baissier : gap baissier valide + EMA rapide (ema_fast) en dessous de l’EMA lente (ema_slow).",
    "Optionnel : attendre une bougie de confirmation si `confirm_candle=true`.",
    "Entrée sur la clôture de la bougie de signal ou après confirmation."
  ],
  params: [
    { name: "min_pips",       desc: "Distance minimale du gap (en unités de prix)." },
    { name: "confirm_candle", desc: "Active/désactive la bougie de confirmation." },
    { name: "ema_fast",       desc: "Période de l’EMA rapide (défaut : 50)." },
    { name: "ema_slow",       desc: "Période de l’EMA lente (défaut : 200)." }
  ],
},

fvg_impulsive_rsi: {
  summary: "FVG impulsif (3 bougies) filtré par l’indicateur RSI.",
  entry: [
    "Détecter un FVG impulsif (gap haussier ou baissier entre n-2 et n).",
    "Signal haussier : gap haussier valide + RSI < seuil choisi (excès de baisse).",
    "Signal baissier : gap baissier valide + RSI > (100 - seuil) (excès de hausse).",
    "Optionnel : attendre une bougie de confirmation si `confirm_candle=true`.",
    "Entrée sur la clôture de la bougie de signal ou après confirmation."
  ],
  params: [
    { name: "min_pips",       desc: "Distance minimale du gap (en unités de prix)." },
    { name: "confirm_candle", desc: "Active/désactive la bougie de confirmation." },
    { name: "rsi_threshold",  desc: "Seuil RSI pour filtrer les signaux (défaut : 50)." }
  ],
},

fvg_impulsive_rsi_ema: {
  summary: "FVG impulsif (3 bougies) avec double filtre : RSI + tendance EMA (ema_fast/ema_slow).",
  entry: [
    "Détecter un FVG impulsif (gap haussier ou baissier entre n-2 et n).",
    "Pour un signal haussier : gap haussier valide + RSI < seuil choisi + EMA rapide (ema_fast) au-dessus de l’EMA lente (ema_slow).",
    "Pour un signal baissier : gap baissier valide + RSI > (100 - seuil) + EMA rapide (ema_fast) en dessous de l’EMA lente (ema_slow).",
    "Optionnel : si `confirm_candle=true`, attendre une bougie de confirmation dans le même sens (haussière ou baissière).",
    "Entrée sur la bougie de signal (ou après la confirmation)."
  ],
  params: [
    { name: "rsi_threshold",  desc: "Seuil RSI utilisé comme filtre de momentum (défaut : 50)." },
    { name: "min_pips",       desc: "Distance minimale du gap (en unités de prix)." },
    { name: "confirm_candle", desc: "Exige une bougie de confirmation dans le sens du signal (true/false)." },
    { name: "ema_fast",       desc: "Période de l’EMA rapide (défaut : 50)." },
    { name: "ema_slow",       desc: "Période de l’EMA lente (défaut : 200)." }
  ],
},
// ------------------- FVG PULLBACK (famille) -------------------

fvg_pullback_multi: {
  summary: "Détection multi-FVG avec pullback. Plusieurs FVG peuvent être actives en parallèle, consommées lors d’un retour dans la zone après un délai minimum ou expirées après un délai maximum.",
  entry: [
    "Détecter une FVG impulsive (écart entre la bougie n-2 et la bougie n).",
    "Conserver la zone comme FVG active.",
    "Attendre au moins `min_wait_candles` avant d’autoriser une entrée.",
    "Si le prix revient dans la zone :",
    " • BUY : retour sur la borne basse d’une FVG haussière.",
    " • SELL : retour sur la borne haute d’une FVG baissière.",
    "Chaque FVG peut être retestée jusqu’à `max_touch` fois avant d’être invalidée.",
    "Une FVG non touchée est expirée après `max_wait_candles` bougies."
  ],
  params: [
    { name: "min_pips",         desc: "Taille minimale du gap (en pips) pour valider une FVG." },
    { name: "min_wait_candles", desc: "Nombre minimum de bougies à attendre avant d’entrer sur un retour." },
    { name: "max_wait_candles", desc: "Durée maximale d’attente avant d’invalider une FVG non touchée." },
    { name: "max_touch",        desc: "Nombre maximal de retours autorisés dans la FVG." },
    { name: "min_overlap_ratio",desc: "Profondeur minimale du retour dans la zone (0.01 = 1%). Laisser vide = entrée à la touche (défaut)." }
  ],
},

fvg_pullback_multi_ema: {
  summary: "FVG Pullback multi-zones avec filtre de tendance EMA (ema_key).",
  entry: [
    "Détection et gestion des FVG multiples (comme la version de base).",
    "Un retour dans la zone n’est valide qu’après `min_wait_candles` et avant `max_wait_candles`.",
    "Filtre de tendance :",
    " • BUY : retour dans FVG haussière + clôture au-dessus de l’EMA.",
    " • SELL : retour dans FVG baissière + clôture en dessous de l’EMA.",
    "Chaque FVG peut être retestée jusqu’à `max_touch` fois avant d’être invalidée."
  ],
  params: [
    { name: "min_pips",         desc: "Taille minimale du gap (en pips) pour valider une FVG." },
    { name: "min_wait_candles", desc: "Nombre minimum de bougies à attendre avant un retour." },
    { name: "max_wait_candles", desc: "Durée maximale d’attente avant expiration de la FVG." },
    { name: "max_touch",        desc: "Nombre maximal de retests autorisés." },
    { name: "ema_key",          desc: "Nom de la colonne EMA utilisée comme filtre (ex: 'EMA_50')." },
    { name: "min_overlap_ratio",desc: "Profondeur minimale du retour dans la zone (0.01 = 1%). Laisser vide = entrée à la touche (défaut)." }
  ],
},

fvg_pullback_multi_rsi: {
  summary: "FVG Pullback multi-zones avec filtre RSI global.",
  entry: [
    "Détection et gestion des FVG multiples (comme la version de base).",
    "Un retour dans la zone est valide uniquement si :",
    " • BUY : RSI < `rsi_threshold`.",
    " • SELL : RSI > (100 - `rsi_threshold`).",
    "Respect de `min_wait_candles`, `max_wait_candles` et `max_touch` comme dans la version de base."
  ],
  params: [
    { name: "min_pips",         desc: "Taille minimale du gap (en pips)." },
    { name: "min_wait_candles", desc: "Nombre minimum de bougies à attendre avant un retour." },
    { name: "max_wait_candles", desc: "Durée maximale d’attente avant expiration de la FVG." },
    { name: "max_touch",        desc: "Nombre maximal de retests autorisés." },
    { name: "rsi_threshold",    desc: "Seuil RSI global (ex: 30 → BUY si RSI <30, SELL si RSI >70)." },
    { name: "min_overlap_ratio",desc: "Profondeur minimale du retour dans la zone (0.01 = 1%). Laisser vide = entrée à la touche (défaut)." }
  ],
},

fvg_pullback_tendance_ema: {
  summary: "FVG Pullback multi-zones avec filtre de tendance EMA (ema_fast/ema_slow).",
  entry: [
    "Détection et gestion des FVG multiples (comme la version de base).",
    "Filtre de tendance EMA obligatoire :",
    " • BUY : EMA_fast > EMA_slow et retour dans une FVG haussière.",
    " • SELL : EMA_fast < EMA_slow et retour dans une FVG baissière.",
    "Entrée uniquement si les conditions de tendance sont respectées.",
    "Respect des paramètres de délai (`min_wait_candles`, `max_wait_candles`) et du nombre de retests (`max_touch`)."
  ],
  params: [
    { name: "min_pips",         desc: "Taille minimale du gap (en pips)." },
    { name: "min_wait_candles", desc: "Nombre minimum de bougies à attendre avant un retour." },
    { name: "max_wait_candles", desc: "Durée maximale d’attente avant expiration de la FVG." },
    { name: "max_touch",        desc: "Nombre maximal de retests autorisés." },
    { name: "ema_fast",         desc: "Nom de la colonne EMA rapide (ex: 'EMA_50')." },
    { name: "ema_slow",         desc: "Nom de la colonne EMA lente (ex: 'EMA_200')." },
    { name: "min_overlap_ratio",desc: "Profondeur minimale du retour dans la zone (0.01 = 1%). Laisser vide = entrée à la touche (défaut)." }
  ],
},

fvg_pullback_tendance_ema_rsi: {
  summary: "FVG Pullback multi-zones avec double filtre EMA (ema_fast/ema_slow) + RSI.",
  entry: [
    "Détection et gestion des FVG multiples (comme la version de base).",
    "Conditions pour valider une entrée :",
    " • BUY : retour dans une FVG haussière + EMA_fast > EMA_slow + RSI < `rsi_threshold`.",
    " • SELL : retour dans une FVG baissière + EMA_fast < EMA_slow + RSI > (100 - `rsi_threshold`).",
    "Respect de l’attente (`min_wait_candles`), de l’expiration (`max_wait_candles`) et du nombre max de retests (`max_touch`)."
  ],
  params: [
    { name: "min_pips",         desc: "Taille minimale du gap (en pips)." },
    { name: "min_wait_candles", desc: "Nombre minimum de bougies à attendre avant un retour." },
    { name: "max_wait_candles", desc: "Durée maximale d’attente avant expiration de la FVG." },
    { name: "max_touch",        desc: "Nombre maximal de retests autorisés." },
    { name: "ema_fast",         desc: "Nom de la colonne EMA rapide (ex: 'EMA_50')." },
    { name: "ema_slow",         desc: "Nom de la colonne EMA lente (ex: 'EMA_200')." },
    { name: "rsi_threshold",    desc: "Seuil RSI global (ex: 30 → BUY si RSI <30, SELL si RSI >70)." },
    { name: "min_overlap_ratio",desc: "Profondeur minimale du retour dans la zone (0.01 = 1%). Laisser vide = entrée à la touche (défaut)." }
  ],
},
// ------------------- OB PULLBACK GAP (famille) -------------------

ob_pullback_gap: {
  summary: "Order Block validé uniquement s’il est suivi immédiatement d’un GAP (aucun chevauchement). L’entrée se fait lors du retour dans l’OB.",
  entry: [
    "Détection d’un OB (bougie d’origine + confirmation).",
    "Validation seulement si la bougie suivante crée un GAP net sans chevauchement avec l’OB (OB*).",
    "Une fois l’OB* détecté, attendre au moins `min_wait_candles` avant d’autoriser l’entrée.",
    "Entrée lors du retour du prix dans la zone de l’OB* (selon direction haussière ou baissière).",
    "Expiration automatique après `max_wait_candles` si aucun retour.",
    "Optionnel : `allow_multiple_entries` pour accepter plusieurs entrées dans la même zone."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Nombre minimum de bougies à attendre avant qu’un retour dans l’OB soit valide." },
    { name: "max_wait_candles",     desc: "Durée maximale (en bougies) avant d’invalider l’OB si aucun retour." },
    { name: "allow_multiple_entries", desc: "Autoriser plusieurs entrées sur le même OB* (true/false)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_gap_ema_simple: {
  summary: "OB* (Order Block + GAP) avec retour dans l’OB + filtre EMA simple.",
  entry: [
    "Détection d’un OB* (Order Block validé par GAP).",
    "Attente d’un retour dans la zone OB après `min_wait_candles` et avant `max_wait_candles`.",
    "Filtre EMA appliqué :",
    " • BUY si le prix clôture au-dessus de l’EMA.",
    " • SELL si le prix clôture en dessous de l’EMA.",
    "Optionnel : `allow_multiple_entries` pour autoriser plusieurs entrées sur la même zone."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Nombre minimum de bougies à attendre avant un retour valide." },
    { name: "max_wait_candles",     desc: "Durée maximale d’attente avant expiration de l’OB*." },
    { name: "allow_multiple_entries", desc: "Permet plusieurs entrées successives dans le même OB* (true/false)." },
    { name: "ema_key",              desc: "Nom de la colonne EMA utilisée comme filtre (ex: 'EMA_50')." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_gap_rsi: {
  summary: "OB* (Order Block + GAP) avec retour dans l’OB + filtre RSI global.",
  entry: [
    "Détection d’un OB* (Order Block validé par GAP).",
    "Attente d’un retour dans la zone OB après `min_wait_candles` et avant `max_wait_candles`.",
    "Filtre RSI appliqué :",
    " • BUY si RSI < `rsi_threshold`.",
    " • SELL si RSI > (100 - `rsi_threshold`).",
    "Optionnel : `allow_multiple_entries` pour autoriser plusieurs entrées sur la même zone."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Nombre minimum de bougies à attendre avant un retour valide." },
    { name: "max_wait_candles",     desc: "Durée maximale d’attente avant expiration de l’OB*." },
    { name: "allow_multiple_entries", desc: "Permet plusieurs entrées successives dans le même OB* (true/false)." },
    { name: "rsi_threshold",        desc: "Seuil RSI global (ex: 40 → BUY si RSI <40, SELL si RSI >60)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_gap_tendance_ema: {
  summary: "OB* (Order Block + GAP) avec retour dans l’OB + filtre de tendance EMA (ema_fast/ema_slow).",
  entry: [
    "Détection d’un OB* (Order Block validé par GAP).",
    "Attente d’un retour dans la zone OB après `min_wait_candles` et avant `max_wait_candles`.",
    "Filtre de tendance EMA :",
    " • BUY si EMA_fast > EMA_slow et retour dans OB haussier.",
    " • SELL si EMA_fast < EMA_slow et retour dans OB baissier.",
    "Optionnel : `allow_multiple_entries` pour autoriser plusieurs entrées.",
    "Expiration après `max_wait_candles` si non touché."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Nombre minimum de bougies à attendre avant un retour valide." },
    { name: "max_wait_candles",     desc: "Durée maximale d’attente avant expiration de l’OB*." },
    { name: "allow_multiple_entries", desc: "Permet plusieurs entrées successives dans la même zone (true/false)." },
    { name: "ema_fast",             desc: "Nom de la colonne EMA rapide (ex: 'EMA_50')." },
    { name: "ema_slow",             desc: "Nom de la colonne EMA lente (ex: 'EMA_200')." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_gap_ema_rsi: {
  summary: "OB* (Order Block + GAP) avec retour dans l’OB, filtré par EMA (ema_fast/ema_slow) et RSI.",
  entry: [
    "Détection d’un OB* (Order Block validé par GAP).",
    "Attente d’un retour dans la zone OB après `min_wait_candles` et avant `max_wait_candles`.",
    "Conditions pour entrer :",
    " • BUY : EMA_fast > EMA_slow ET RSI < `rsi_threshold`.",
    " • SELL : EMA_fast < EMA_slow ET RSI > (100 - `rsi_threshold`).",
    "Retour dans la zone OB obligatoire, avec respect du délai et de l’expiration.",
    "Optionnel : `allow_multiple_entries` pour autoriser plusieurs entrées."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Nombre minimum de bougies à attendre avant un retour valide." },
    { name: "max_wait_candles",     desc: "Durée maximale d’attente avant expiration de l’OB*." },
    { name: "allow_multiple_entries", desc: "Permet plusieurs entrées successives dans la même zone (true/false)." },
    { name: "ema_fast",             desc: "Nom de l’EMA rapide utilisée (ex: 'EMA_50')." },
    { name: "ema_slow",             desc: "Nom de l’EMA lente utilisée (ex: 'EMA_200')." },
    { name: "rsi_threshold",        desc: "Seuil RSI global (ex: 40 → BUY si RSI <40, SELL si RSI >60)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},
// ------------------- OB PULLBACK (pur) -------------------

ob_pullback_pure: {
  summary: "Order Block simple (sans exigence de gap) avec entrée lors du retour du prix dans la zone de l’OB.",
  entry: [
    "Détecter un OB : bougie d’origine avec inversion (bullish si pré-OB rouge puis OB verte ; bearish si pré-OB verte puis OB rouge).",
    "Conserver la zone OB (ob_high / ob_low).",
    "Attendre au moins `min_wait_candles` avant d’autoriser l’entrée.",
    "Entrée quand la bougie recroise la zone OB :",
    " • BUY : si le prix revient entre ob_low et ob_high d’un OB haussier.",
    " • SELL : si le prix revient entre ob_low et ob_high d’un OB baissier.",
    "Expiration après `max_wait_candles`, option `allow_multiple_entries` pour autoriser plusieurs entrées."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Attente minimale (en bougies) avant une entrée valide." },
    { name: "max_wait_candles",     desc: "Expiration de l’OB si non touché avant ce délai (en bougies)." },
    { name: "allow_multiple_entries", desc: "Autoriser plusieurs entrées dans la même zone OB (true/false)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_pure_ema_simple: {
  summary: "OB (sans gap) avec retour dans l’OB, filtré par une EMA unique (close vs EMA).",
  entry: [
    "Détecter un OB simple et attendre `min_wait_candles`.",
    "Filtre EMA appliqué sur la bougie d’entrée :",
    " • BUY : Close > EMA.",
    " • SELL : Close < EMA.",
    "Entrée uniquement si la bougie recroise la zone OB dans le bon sens, avant `max_wait_candles`."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Attente minimale avant entrée." },
    { name: "max_wait_candles",     desc: "Expiration de l’OB si non touché." },
    { name: "allow_multiple_entries", desc: "Plusieurs entrées autorisées dans la même zone (true/false)." },
    { name: "ema_key",              desc: "Nom de la colonne EMA utilisée (ex : 'EMA_50')." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_pure_rsi: {
  summary: "OB (sans gap) avec retour dans l’OB, filtré par RSI global (symétrique).",
  entry: [
    "Détecter un OB simple et attendre `min_wait_candles`.",
    "Filtre RSI sur la bougie d’entrée :",
    " • BUY : RSI < `rsi_threshold`.",
    " • SELL : RSI > (100 - `rsi_threshold`).",
    "Valider l’entrée si la bougie recroise la zone OB avant `max_wait_candles`."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Attente minimale avant entrée." },
    { name: "max_wait_candles",     desc: "Expiration de l’OB si non touché." },
    { name: "allow_multiple_entries", desc: "Plusieurs entrées autorisées (true/false)." },
    { name: "rsi_threshold",        desc: "Seuil RSI global (ex : 40 → BUY si <40, SELL si >60)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_pure_ema_simple_rsi: {
  summary: "OB (sans gap) avec retour dans l’OB + double filtre Close vs EMA et RSI global.",
  entry: [
    "Détecter un OB simple et attendre `min_wait_candles`.",
    "Conditions d’entrée :",
    " • BUY : Close > EMA ET RSI < `rsi_threshold` + retour dans l’OB.",
    " • SELL : Close < EMA ET RSI > (100 - `rsi_threshold`) + retour dans l’OB.",
    "Respecter l’expiration `max_wait_candles` et l’option `allow_multiple_entries`."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Attente minimale avant entrée." },
    { name: "max_wait_candles",     desc: "Expiration de l’OB si non touché." },
    { name: "allow_multiple_entries", desc: "Plusieurs entrées autorisées (true/false)." },
    { name: "ema_key",              desc: "Colonne EMA utilisée (ex : 'EMA_50')." },
    { name: "rsi_threshold",        desc: "Seuil RSI global (ex : 40 → BUY si <40, SELL si >60)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_pure_tendance_ema: {
  summary: "OB (sans gap) avec retour dans l’OB + filtre de tendance EMA (ema_fast/ema_slow).",
  entry: [
    "Détecter un OB simple et attendre `min_wait_candles`.",
    "Filtre de tendance EMA requis sur la bougie d’entrée :",
    " • BUY : `ema_fast` > `ema_slow` + retour dans l’OB haussier.",
    " • SELL : `ema_fast` < `ema_slow` + retour dans l’OB baissier.",
    "Entrée uniquement avant `max_wait_candles`."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Attente minimale avant entrée." },
    { name: "max_wait_candles",     desc: "Expiration de l’OB si non touché." },
    { name: "allow_multiple_entries", desc: "Plusieurs entrées autorisées (true/false)." },
    { name: "ema_fast",             desc: "Nom de l’EMA rapide (ex : 'EMA_50')." },
    { name: "ema_slow",             desc: "Nom de l’EMA lente (ex : 'EMA_200')." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},

ob_pullback_pure_tendance_ema_rsi: {
  summary: "OB (sans gap) avec retour dans l’OB + tendance EMA (ema_fast/ema_slow) + filtre RSI global.",
  entry: [
    "Détecter un OB simple et attendre `min_wait_candles`.",
    "Conditions d’entrée :",
    " • BUY : `ema_fast` > `ema_slow` ET RSI < `rsi_threshold` + retour dans l’OB haussier.",
    " • SELL : `ema_fast` < `ema_slow` ET RSI > (100 - `rsi_threshold`) + retour dans l’OB baissier.",
    "Expiration après `max_wait_candles`, option `allow_multiple_entries`."
  ],
  params: [
    { name: "min_wait_candles",     desc: "Attente minimale avant entrée." },
    { name: "max_wait_candles",     desc: "Expiration de l’OB si non touché." },
    { name: "allow_multiple_entries", desc: "Plusieurs entrées autorisées (true/false)." },
    { name: "ema_fast",             desc: "Colonne EMA rapide (ex : 'EMA_50')." },
    { name: "ema_slow",             desc: "Colonne EMA lente (ex : 'EMA_200')." },
    { name: "rsi_threshold",        desc: "Seuil RSI global (ex : 40 → BUY si <40, SELL si >60)." },
    { name: "min_overlap_ratio",      desc: "Profondeur minimale du retour (0.01 = 1%). Vide = touche." }
  ],
},


  // ➜ Ajoute tes autres strats ci-dessous, même structure :
  // "ma_strategie_backend": {
  //   summary: "Résumé clair…",
  //   entry: ["Condition 1…", "Condition 2…"],
  //   params: [
  //     { name: "min_pips", desc: "Seuil minimal en pips." },
  //     { name: "ema_key",  desc: "Clé EMA utilisée." },
  //   ],
  //   tags: ["optionnel"],
  // },
};

export default STRATEGY_DOCS;

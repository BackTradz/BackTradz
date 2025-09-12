// src/config/docs/pairs.docs.js
// 🎯 Fiches "paires" / symboles pour la page À savoir → Section techniques.
// Couverture 1:1 avec src/config/labels/pairs.map.js (mêmes clés).
//
// Champs par entrée :
//  - label   : nom UX (doit correspondre au label de pairs.map.js pour cohérence visuelle)
//  - summary : 1–2 phrases claires sur le marché, horaires, particularités
//  - specs   : puces techniques (marché, pip/tick, sessions, volatilité, actus)
//  - notes   : conseils backtest/exécution (pièges, latence, mèche, spread…)
//  - links   : liens internes utiles (backtest & CSV shop préfiltrés)
//
// NB: Les unités « pip » sont données pour l’usage BackTradz (XAUUSD pip ≈ 0.1$).
//     Les horaires/sessions sont donnés en logique générale (UTC à harmoniser côté data).

const mkLinks = (sym) => ([
  { label: `Backtester ${sym}`, href: `/backtest?symbol=${encodeURIComponent(sym)}` },
  { label: "CSV Shop", href: `/csv-shop?symbol=${encodeURIComponent(sym)}` },
]);

const PAIR_DOCS = {
  // ===========================
  // MÉTAUX
  // ===========================
  "GC=F": {
    label: "Gold Futures (GC=F)",
    summary:
      "Contrat future Or (COMEX). Carnet futures, horaires étendus, corrélé risk-on/off. Très réactif news US.",
    specs: [
      "Marché: Futures COMEX (CME Group).",
      "Tick futures: $0.10 ; XAUUSD spot (référence pip BackTradz) ≈ 0.1 $/pip.",
      "Sessions clés: London Open, NY Open.",
      "News sensibles: NFP, CPI, FOMC, PMI US.",
    ],
    notes:
      "Fréquent ‘wick’ sur niveaux. Prévoir SL ‘respirant’. Bien aligner timezones si comparaison spot/futures.",
    links: mkLinks("GC=F"),
  },
  "XAUUSD": {
    label: "Gold (XAUUSD)",
    summary:
      "Or spot. Liquide en sessions Europe/US, week-end fermé. Très technique sur H1/H4 avec zones d’offre/demande.",
    specs: [
      "Marché: Spot (cash).",
      "Pip: ≈ 0.1 $.",
      "Volatilité: soutenue London/NY, calme Asie hors spikes.",
      "Catalyseurs: Dollar, taux US, risk sentiment.",
    ],
    notes:
      "Éviter contre-tendance violente sur news. Mèches fréquentes: ne pas ‘trop’ serrer les stops en M5.",
    links: mkLinks("XAUUSD"),
  },
  "SI=F": {
    label: "Silver Futures (Argent)",
    summary:
      "Argent futures (COMEX). Plus nerveux que l’or, volatilité intraday élevée, corrélation partielle XAU.",
    specs: [
      "Marché: Futures COMEX.",
      "Tick: $0.005 ; spot pip ~0.01 $.",
      "Sessions: Europe/US dominantes.",
      "Sensibilité: Dollar, industrial metals, sentiment global.",
    ],
    notes:
      "Mouvements abrupts possibles. Teste plusieurs SL/TP pour éviter ‘stop hunts’.",
    links: mkLinks("SI=F"),
  },
  "PL=F": {
    label: "Platinum Futures (Platine)",
    summary:
      "Platine futures. Moins liquide que l’or/argent, plus « gap prone ». Utilisé dans l’auto (catalyseurs).",
    specs: [
      "Marché: Futures NYMEX.",
      "Tick: $0.10.",
      "Sessions: surtout US.",
      "Sensibilité: demande industrielle, USD, auto.",
    ],
    notes:
      "Liquidité plus faible → prudence sur backtests très court terme (slippage).",
    links: mkLinks("PL=F"),
  },
  "HG=F": {
    label: "Copper Futures (Cuivre)",
    summary:
      "Cuivre futures (COMEX). Baromètre macro/industrie Chine. Volatilité liée aux données manufacturières.",
    specs: [
      "Marché: Futures COMEX.",
      "Tick: $0.0005.",
      "Sessions: Asie (Chine) + Europe/US.",
      "News: PMI Chine/US, stocks LME, données construction.",
    ],
    notes:
      "Peut trend fort sur thèmes macro (reflation/déflation). Évite contre-tendances H1.",
    links: mkLinks("HG=F"),
  },

  // ===========================
  // ÉNERGIE
  // ===========================
  "CL=F": {
    label: "Crude Oil WTI Futures (Pétrole brut West Texas)",
    summary:
      "WTI futures (NYMEX). Très sensible stocks API/EIA, décisions OPEP+, géopolitique.",
    specs: [
      "Marché: Futures NYMEX.",
      "Tick: $0.01/baril.",
      "Sessions: US dominante ; réactions aussi en Asie (news).",
      "News: API (mar), EIA (mer), OPEP+.",
    ],
    notes:
      "Volatilité news élevée. Backtests: vérifier fenêtres autour API/EIA (faux signaux possibles).",
    links: mkLinks("CL=F"),
  },
  "BZ=F": {
    label: "Brent Crude Oil Futures (Pétrole Brent)",
    summary:
      "Brent (ICE). Référence Europe/International. Souvent corrélé WTI, parfois spread spécifique.",
    specs: [
      "Marché: ICE Futures Europe.",
      "Tick: $0.01.",
      "Sessions: Europe/US, mouvements aussi en Asie.",
      "Catalyseurs: OPEP+, disruptions supply, spreads WTI/Brent.",
    ],
    notes:
      "Comparer à WTI pour contexte spread. Survolatilité sur headlines géopolitiques.",
    links: mkLinks("BZ=F"),
  },

  // ===========================
  // AGRICOLES
  // ===========================
  "ZC=F": {
    label: "Corn Futures (Maïs)",
    summary:
      "Maïs CBOT. Cycles saisonniers (semis/récolte), météo US/AmSud, rapports USDA.",
    specs: [
      "Marché: CBOT (CME Group).",
      "Tick: 0.25 cent/bushel.",
      "Sessions: US ; saisonnalité marquée.",
      "News: WASDE/USDA, météo, exportations.",
    ],
    notes:
      "Saisonnalité → backtests par période pertinents. Volatilité liée météo (spikes).",
    links: mkLinks("ZC=F"),
  },

  // ===========================
  // INDICES ACTIONS
  // ===========================
  "^AXJO": {
    label: "S&P/ASX 200 (Australie)",
    summary:
      "Indice australien large. Mouvement surtout en session Asie/Pacifique.",
    specs: [
      "Marché: Actions AU.",
      "Heures: Asie (UTC nuit/early).",
      "Sensibilité: matières premières, banques.",
      "Corrélations: commodities/Chine.",
    ],
    notes:
      "Volatilité moindre hors Asie. Backtests plutôt H1/H4.",
    links: mkLinks("^AXJO"),
  },
  "^BSESN": {
    label: "BSE Sensex (Inde)",
    summary:
      "Indice indien historique (30 valeurs). Session Inde (IST).",
    specs: [
      "Marché: Actions IN.",
      "Heures: Asie (UTC ~04:45–10:00).",
      "Catalyseurs: flux EM, RBI, macro Inde.",
      "Volatilité: pics sur résultats & budget.",
    ],
    notes:
      "Gaps plus fréquents (actions). Préférer TF > M15.",
    links: mkLinks("^BSESN"),
  },
  "^BVSP": {
    label: "Bovespa (Brésil)",
    summary:
      "Indice principal Brésil. Sensible matières premières, Real (BRL) et flux EM.",
    specs: [
      "Marché: Actions BR.",
      "Heures: Amériques.",
      "Catalyseurs: pétrole/minières, politique BR.",
      "Volatilité: headlines macro/politiques.",
    ],
    notes:
      "Risque gap. Attention aux périodes d’illiquidité locale.",
    links: mkLinks("^BVSP"),
  },
  "^DJI": {
    label: "Dow Jones (USA)",
    summary:
      "30 blue chips US. Influence forte à NY, réagit aux données macro US.",
    specs: [
      "Marché: Actions US.",
      "Heures: US Cash (14:30–21:00 UTC env.).",
      "News: NFP, CPI, FOMC, earnings.",
      "Corrélations: GSPC/IXIC variables selon secteur.",
    ],
    notes:
      "Peut diverger du S&P selon pondérations. Backtests sessions US efficaces.",
    links: mkLinks("^DJI"),
  },
  "^FCHI": {
    label: "CAC 40 (France)",
    summary:
      "Indice phare France. Pic de flux sur Europe AM et US Open.",
    specs: [
      "Marché: Actions FR.",
      "Heures: Europe.",
      "Catalyseurs: ECB, macro EU, luxe, énergie.",
      "Volatilité: accrue sur 8:00–10:00 & 14:30–16:00 UTC.",
    ],
    notes:
      "Gaps quotidiens (cash). Éviter M1 en backtests historiques.",
    links: mkLinks("^FCHI"),
  },
  "^FTSE": {
    label: "FTSE 100 (UK)",
    summary:
      "100 grandes capitalisations UK. Sensible commodités & GBP.",
    specs: [
      "Marché: Actions UK.",
      "Heures: Europe.",
      "Catalyseurs: BoE, GBP, commodities.",
      "Profil: défensif vs DAX/CAC selon périodes.",
    ],
    notes:
      "Corrélation partielle au GBP (inversée parfois).",
    links: mkLinks("^FTSE"),
  },
  "^GDAXI": {
    label: "DAX 40 (Allemagne)",
    summary:
      "Indice allemand très tradé en Europe. Fort volume à l’open, mouvements propres en tendance.",
    specs: [
      "Marché: Actions DE.",
      "Heures: Europe.",
      "Catalyseurs: macro EU/DE, ECB, PMI.",
      "Volatilité: 7:00–10:00 & 13:30–16:00 UTC.",
    ],
    notes:
      "Ouvertures explosives possible. SL pas trop serrés en M5.",
    links: mkLinks("^GDAXI"),
  },
  "^GSPC": {
    label: "S&P 500 (USA)",
    summary:
      "Indice US large (500). Référence mondiale risk-on/off. Très propre en tendances post-news.",
    specs: [
      "Marché: Actions US.",
      "Heures: US.",
      "News: NFP, CPI, FOMC, earnings macro-sensibles.",
      "Volatilité: Open US, 15:30–17:00 UTC souvent actif.",
    ],
    notes:
      "Beaucoup de stratégies ‘classiques’ fonctionnent sur H1/H4.",
    links: mkLinks("^GSPC"),
  },
  "^HSI": {
    label: "Hang Seng (Hong Kong)",
    summary:
      "Indice HK. Fortement lié à Chine tech/finance. Mouvements Asiatiques matin.",
    specs: [
      "Marché: Actions HK.",
      "Heures: Asie (pause déjeuner).",
      "Catalyseurs: news Chine, USD/CNH.",
      "Volatilité: ouverture Asie.",
    ],
    notes:
      "Peut être saccadé en M1. Préférer M15+ pour robustesse.",
    links: mkLinks("^HSI"),
  },
  "^IXIC": {
    label: "NASDAQ Composite (USA)",
    summary:
      "Tech growth. Très sensible taux réels/10Y & résultats FAANG.",
    specs: [
      "Marché: Actions US.",
      "Heures: US.",
      "News sensibles: CPI, FOMC, PPI, NFP.",
      "Corrélations: inverse partielle avec ^TNX.",
    ],
    notes:
      "Overreaction possible sur earnings. Filtre macro utile.",
    links: mkLinks("^IXIC"),
  },
  "^N225": {
    label: "Nikkei 225 (Japon)",
    summary:
      "Indice japonais. Lié à USD/JPY, politique BoJ, exportations.",
    specs: [
      "Marché: Actions JP.",
      "Heures: Asie (pause).",
      "Catalyseurs: BoJ, USD/JPY, US tech overnight.",
      "Volatilité: open Asie.",
    ],
    notes:
      "Influence USD/JPY → check filtre directionnel macro.",
    links: mkLinks("^N225"),
  },
  "^STOXX50E": {
    label: "Euro Stoxx 50 (Zone euro)",
    summary:
      "Indice zone euro large. Exécution propre sur sessions Europe/US.",
    specs: [
      "Marché: Actions EU.",
      "Heures: Europe.",
      "Catalyseurs: ECB, macro EU, énergie.",
      "Volatilité: open Europe, pré-US open.",
    ],
    notes:
      "Gaps fréquents → préférer > M5 pour backtests historiques.",
    links: mkLinks("^STOXX50E"),
  },

  // ===========================
  // TAUX / VOLATILITÉ
  // ===========================
  "^TNX": {
    label: "T-Notes 10 ans (rendement, USA)",
    summary:
      "Proxy rendement 10Y US (×10). Impacte fortement tech/indices et USD.",
    specs: [
      "Marché: Taux US (synthèse).",
      "Corrélations: négative fréquente avec NASDAQ.",
      "News: CPI, NFP, FOMC, auctions.",
      "Utilité: filtre macro directionnel.",
    ],
    notes:
      "Pas pour trade direct chez BackTradz, mais excellent filtre contexte.",
    links: mkLinks("^TNX"),
  },
  "^VIX": {
    label: "Indice VIX (volatilité S&P 500)",
    summary:
      "Volatilité implicite 30j sur options S&P 500. Monte en stress, baisse en risk-on.",
    specs: [
      "Marché: Dérivés CBOE (indice synthèse).",
      "Zone: >20 = stress relatif ; <15 = calme (indicatif).",
      "Corrélation: inverse S&P 500.",
      "Usage: filtre régime de marché.",
    ],
    notes:
      "À utiliser comme contexte (pas en cible d’exécution ici).",
    links: mkLinks("^VIX"),
  },

  // ===========================
  // CRYPTO
  // ===========================
  "BTC-USD": {
    label: "Bitcoin (BTC-USD)",
    summary:
      "Crypto majeure 24/7. Réagit aux flux on-chain, macro USD et liquidations futures.",
    specs: [
      "Marché: crypto spot (Yahoo).",
      "Heures: 24/7.",
      "TF usuels: M5/M15/H1.",
      "Volatilité: forte, surtout US après-midi & week-ends.",
    ],
    notes:
      "Wicks fréquents → stops adaptés. Éviter chase en breakouts ‘trop obvious’.",
    links: mkLinks("BTC-USD"),
  },
  "ETH-USD": {
    label: "Ethereum (ETH-USD)",
    summary:
      "Alt majeure. Corrélée BTC mais plus nerveuse. Catalyseurs L2, staking, ETF (si actif).",
    specs: [
      "Marché: crypto spot.",
      "Heures: 24/7.",
      "Volatilité: élevée ; corrélation BTC variable.",
      "Catalyseurs: upgrades, flux DeFi/NFT.",
    ],
    notes:
      "Spreads variables selon exchanges. Préférer signaux confirmés multi-TF.",
    links: mkLinks("ETH-USD"),
  },

  // ===========================
  // FOREX MAJEURES / CROSSES
  // ===========================
  "AUDCHF": {
    label: "AUD/CHF",
    summary:
      "Cross AUD vs CHF. Mix risque matières premières (AUD) et valeur refuge (CHF).",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Asie (AUD) + Europe (CHF).",
      "Catalyseurs: RBA, SNB, commodities, risk appetite.",
      "Volatilité: modérée, pics news.",
    ],
    notes:
      "Tendance propre sur thèmes risk-on/off. Éviter range serré en M5.",
    links: mkLinks("AUDCHF"),
  },
  "AUDJPY": {
    label: "AUD/JPY",
    summary:
      "Baromètre risk-on/off Asie (carry trade historique). Fortement directionnel sur tendances macro.",
    specs: [
      "Pip: 0.01 (JPY).",
      "Sessions: Asie dominante.",
      "Catalyseurs: RBA, BoJ, commodities, CN data.",
      "Volatilité: régulière, tendances nettes.",
    ],
    notes:
      "Filtre H1 EMA/RSI efficace pour éviter contresens violents.",
    links: mkLinks("AUDJPY"),
  },
  "AUDUSD": {
    label: "AUD/USD",
    summary:
      "Majeure liée à commodities et Chine. Liquide, patterns propres.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Asie + chevauchement Europe/US.",
      "Catalyseurs: RBA, données Chine/US.",
      "Volatilité: propre en London/NY.",
    ],
    notes:
      "Bien pour test multi-strat M15/H1.",
    links: mkLinks("AUDUSD"),
  },
  "CHFJPY": {
    label: "CHF/JPY",
    summary:
      "Deux devises refuge. Mouvement plus technique, cassures parfois ‘propres’.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Europe+Asie.",
      "Catalyseurs: SNB, BoJ, risk-off global.",
      "Volatilité: modérée, spikes news.",
    ],
    notes:
      "Bon pour stratégies de breakout H1.",
    links: mkLinks("CHFJPY"),
  },
  "EURAUD": {
    label: "EUR/AUD",
    summary:
      "Mix Europe vs matières premières. Mouvements directionnels sur divergences EU/Chine.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe principalement.",
      "Catalyseurs: ECB, RBA, risk sentiment.",
      "Volatilité: bonne en London.",
    ],
    notes:
      "Peut ‘trend’ plusieurs jours sur thème macro.",
    links: mkLinks("EURAUD"),
  },
  "EURCHF": {
    label: "EUR/CHF",
    summary:
      "Cross Europe/refuge. Souvent rangé, cassures propres autour de news ECB/SNB.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe.",
      "Catalyseurs: ECB, SNB, flux risk-on/off EU.",
      "Volatilité: plutôt contenue.",
    ],
    notes:
      "Spread parfois plus large hors Europe. Favoriser H1+.",
    links: mkLinks("EURCHF"),
  },
  "EURGBP": {
    label: "EUR/GBP",
    summary:
      "Spread EU/UK. Mouvement lors de divergences macro (ECB vs BoE).",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe (matin).",
      "Catalyseurs: CPI/PMI UK/EU, banques centrales.",
      "Volatilité: modérée.",
    ],
    notes:
      "Pair souvent ‘propre’ pour mean-revert H1.",
    links: mkLinks("EURGBP"),
  },
  "EURJPY": {
    label: "EUR/JPY",
    summary:
      "Très tradée. Combinaison EUR (macro EU) et JPY (BoJ/taux réels).",
    specs: [
      "Pip: 0.01.",
      "Sessions: Europe + Asie.",
      "Catalyseurs: ECB, BoJ, US yields.",
      "Volatilité: tendance fréquente.",
    ],
    notes:
      "Bon actif pour stratégies pullback tendance.",
    links: mkLinks("EURJPY"),
  },
  "EURUSD": {
    label: "EUR/USD",
    summary:
      "La paire la plus liquide. Réagit fortement aux stats US/EU, tendance claire sur sessions London/NY.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe/US.",
      "Catalyseurs: CPI/NFP/Fed vs ECB.",
      "Volatilité: open London et US.",
    ],
    notes:
      "Spread serré. Idéale pour backtests de référence.",
    links: mkLinks("EURUSD"),
  },
  "GBPCHF": {
    label: "GBP/CHF",
    summary:
      "Livre vs refuge. Spikes fréquents sur news UK.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe.",
      "Catalyseurs: BoE, CPI UK, risk-off.",
      "Volatilité: élevée sur UK openings.",
    ],
    notes:
      "Gère le risque sur news ; M15/H1 recommandé.",
    links: mkLinks("GBPCHF"),
  },
  "GBPJPY": {
    label: "GBP/JPY",
    summary:
      "Très volatile (‘Guppy’). Fortement directionnel, mais wicks violents.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Europe + Asie.",
      "Catalyseurs: BoE/BoJ, yields US.",
      "Volatilité: très élevée intraday.",
    ],
    notes:
      "SL généreux sinon stop hunts fréquents.",
    links: mkLinks("GBPJPY"),
  },
  "GBPUSD": {
    label: "GBP/USD",
    summary:
      "Cable. Forte réaction aux données UK/US. Pattern propre en London/NY.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe/US.",
      "Catalyseurs: BoE/Fed, CPI/PMI.",
      "Volatilité: soutenue aux opens.",
    ],
    notes:
      "Peut ‘overreact’. Attendre confirmation multi-TF.",
    links: mkLinks("GBPUSD"),
  },
  "NZDJPY": {
    label: "NZD/JPY",
    summary:
      "Risque Asie/Pacifique. Plus ‘doux’ qu’AUDJPY mais directionnel.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Asie.",
      "Catalyseurs: RBNZ, BoJ, commodities.",
      "Volatilité: moyenne.",
    ],
    notes:
      "Strats tendance > range pour robustesse.",
    links: mkLinks("NZDJPY"),
  },
  "NZDUSD": {
    label: "NZD/USD",
    summary:
      "Majeure Pacifique. Corrélée matières premières & Chine.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Asie + Europe/US.",
      "Catalyseurs: RBNZ, Chine, US macro.",
      "Volatilité: propre.",
    ],
    notes:
      "Fonctionne bien en pullback tendance M15/H1.",
    links: mkLinks("NZDUSD"),
  },
  "USDCAD": {
    label: "USD/CAD",
    summary:
      "Très lié pétrole (CAD). Réagit aux stocks EIA et NFP/CPI US.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: US/Canada.",
      "Catalyseurs: BoC, EIA, US macro.",
      "Corrélation: inverse WTI fréquente.",
    ],
    notes:
      "Bien surveiller CL=F comme filtre.",
    links: mkLinks("USDCAD"),
  },
  "USDCHF": {
    label: "USD/CHF",
    summary:
      "Dollar vs refuge CHF. Souvent lisse, corrélé EURUSD inversé.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe/US.",
      "Catalyseurs: SNB, US macro.",
      "Volatilité: modérée.",
    ],
    notes:
      "Peut aider au hedge vs EURUSD.",
    links: mkLinks("USDCHF"),
  },
  "USDHKD": {
    label: "USD/HKD",
    summary:
      "HKD ancré (band currency board). Faible volatilité hors stress.",
    specs: [
      "Pip: 0.0001.",
      "Band: 7.75–7.85 (indicatif).",
      "Sessions: Asie.",
      "Volatilité: faible la plupart du temps.",
    ],
    notes:
      "Peu d’intérêt trading directionnel; utile en doc/filtre.",
    links: mkLinks("USDHKD"),
  },
  "USDHUF": {
    label: "USD/HUF",
    summary:
      "Forex émergent (Forint). Plus de spread, volatilité news EU/US/HU.",
    specs: [
      "Pip: 0.01 (souvent pointés en 1/100).",
      "Sessions: Europe.",
      "Catalyseurs: MNB, EU macro.",
      "Volatilité: plus heurtée.",
    ],
    notes:
      "Backtests: préférer H1+ pour robustesse.",
    links: mkLinks("USDHUF"),
  },
  "USDILS": {
    label: "USD/ILS",
    summary:
      "Shekel israélien. Mouvements liés géopolitique/tech locale.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe/Moyen-Orient.",
      "Catalyseurs: BoI, géopolitique.",
      "Volatilité: irrégulière.",
    ],
    notes:
      "Spread variable; éviter M1/M5 hors liquidité.",
    links: mkLinks("USDILS"),
  },
  "USDJPY": {
    label: "USD/JPY",
    summary:
      "Paire macro clé (taux US réels vs BoJ). Très suivie, tendances fortes.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Asie/US.",
      "Catalyseurs: BoJ, US yields, interventions MoF.",
      "Volatilité: accélérations soudaines.",
    ],
    notes:
      "Attention interventions surprises (flash moves).",
    links: mkLinks("USDJPY"),
  },
  "USDKRW": {
    label: "USD/KRW",
    summary:
      "Won coréen. Plus exotique, mouvements Asie, spread plus large.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Asie.",
      "Catalyseurs: BoK, tech Corée, USD.",
      "Volatilité: heurtée.",
    ],
    notes:
      "Backtests: H1+ conseillé pour qualité.",
    links: mkLinks("USDKRW"),
  },
  "USDMXN": {
    label: "USD/MXN",
    summary:
      "Forex LatAm. Spreads plus larges hors US, volatilité news/banque centrale.",
    specs: [
      "Pip: 0.0001 (quoté 1/10k).",
      "Sessions: Amériques.",
      "Catalyseurs: Banxico, pétrole, USD.",
      "Volatilité: élevée en news.",
    ],
    notes:
      "Éviter ultra-court terme hors US session.",
    links: mkLinks("USDMXN"),
  },
  "USDNOK": {
    label: "USD/NOK",
    summary:
      "Couronne norvégienne (pays producteur pétrole).",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe.",
      "Catalyseurs: Norges Bank, pétrole.",
      "Corrélation: WTI/Brent.",
    ],
    notes:
      "Checker CL=F/BZ=F comme filtre directionnel.",
    links: mkLinks("USDNOK"),
  },
  "USDPLN": {
    label: "USD/PLN",
    summary:
      "Zloty polonais. Plus exotique, volatilité news PL/EU/US.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe.",
      "Catalyseurs: NBP, EU macro.",
      "Volatilité: irrégulière.",
    ],
    notes:
      "Backtests > M15 conseillés.",
    links: mkLinks("USDPLN"),
  },
  "USDRUB": {
    label: "USD/RUB",
    summary:
      "Rouble russe. Contrainte de liquidité/sanctions, données parfois non fiables.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Europe.",
      "Risques: liquidité, écarts importants.",
      "Utilisation: documentaire.",
    ],
    notes:
      "Éviter backtests/exécution live pour risque data/exécution.",
    links: mkLinks("USDRUB"),
  },
  "USDSEK": {
    label: "USD/SEK",
    summary:
      "Couronne suédoise. Liquide Europe, corrélée risk sentiment EU.",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Europe.",
      "Catalyseurs: Riksbank, EU/US macro.",
      "Volatilité: moyenne.",
    ],
    notes:
      "Souvent propre H1/H4.",
    links: mkLinks("USDSEK"),
  },
  "USDSGD": {
    label: "USD/SGD",
    summary:
      "Dollar Singapour. MAS gère via band sur taux de change effectif (NEER).",
    specs: [
      "Pip: 0.0001.",
      "Sessions: Asie.",
      "Catalyseurs: MAS, US macro.",
      "Volatilité: contenue hors stress.",
    ],
    notes:
      "Moins directionnel que majeures G10.",
    links: mkLinks("USDSGD"),
  },
  "USDTHB": {
    label: "USD/THB",
    summary:
      "Baht thaïlandais. Plus exotique, spread/latence supérieurs.",
    specs: [
      "Pip: 0.01.",
      "Sessions: Asie.",
      "Catalyseurs: BoT, tourisme, USD.",
      "Volatilité: heurtée.",
    ],
    notes:
      "M15/H1 conseillé pour backtests.",
    links: mkLinks("USDTHB"),
  },
  "USDTRY": {
    label: "USD/TRY",
    summary:
      "Livre turque. Mouvements extrêmes possibles, spreads importants.",
    specs: [
      "Pip: 0.0001 (quoté 1/10k).",
      "Sessions: Europe.",
      "Catalyseurs: CBRT, inflation TR, politique.",
      "Volatilité: très élevée / gaps.",
    ],
    notes:
      "Risque exécution. Backtests informatifs seulement.",
    links: mkLinks("USDTRY"),
  },
  "USDZAR": {
    label: "USD/ZAR",
    summary:
      "Rand sud-africain. Corrélé commodities, spreads plus larges.",
    specs: [
      "Pip: 0.0001 (souvent 1/10k).",
      "Sessions: Europe/Amériques.",
      "Catalyseurs: SARB, métaux, USD.",
      "Volatilité: heurtée.",
    ],
    notes:
      "Éviter scalping serré. Préférer H1.",
    links: mkLinks("USDZAR"),
  },
};
export default PAIR_DOCS;

/* ✅ Ajout non-breaking : table des pips BackTradz (valeur du “pip” côté plateforme)
   - Forex non-JPY : 0.0001
   - Forex JPY      : 0.01
   - XAUUSD (spot)  : 0.1
   - Futures métaux : GC=F 0.1 ; SI=F 0.01 ; PL=F 0.1 ; HG=F 0.0005
   - Énergie        : CL=F 0.01 ; BZ=F 0.01
   - Agricole       : ZC=F 0.25 (¼ cent/bu)
   - Indices        : 1 (point d’indice)
   - Crypto         : 1 (1 $)
   - Devises exotiques: voir ci-dessous
*/
export const PAIR_PIPS = {
  // --- Métaux / énergie / agri (futures & spot)
  "GC=F": 0.1,
  "XAUUSD": 0.1,
  "SI=F": 0.01,
  "PL=F": 0.1,
  "HG=F": 0.0005,
  "CL=F": 0.01,
  "BZ=F": 0.01,
  "ZC=F": 0.25,

  // --- Indices actions (points)
  "^AXJO": 1,
  "^BSESN": 1,
  "^BVSP": 1,
  "^DJI": 1,
  "^FCHI": 1,
  "^FTSE": 1,
  "^GDAXI": 1,
  "^GSPC": 1,
  "^HSI": 1,
  "^IXIC": 1,
  "^N225": 1,
  "^STOXX50E": 1,

  // --- Taux / Volatilité (affichage contexte)
  "^TNX": 0.01, // “point” de rendement (×10 sur Yahoo) → ici 0.01 est pratique pour affichage
  "^VIX": 0.1,  // pas de pip “trading”, point de VIX à 0.1 pour métriques

  // --- Crypto (USD)
  "BTC-USD": 1,
  "ETH-USD": 0.01,

  // --- Forex majeures & crosses (G10)
  "EURUSD": 0.0001,
  "GBPUSD": 0.0001,
  "AUDUSD": 0.0001,
  "NZDUSD": 0.0001,
  "USDCHF": 0.0001,
  "USDCAD": 0.0001,
  "USDSEK": 0.0001,
  "USDNOK": 0.0001,
  "USDSGD": 0.0001,
  "USDPLN": 0.0001,
  "USDILS": 0.0001,
  "USDHKD": 0.0001,
  "USDHUF": 0.01,  // souvent coté au centième
  "USDMXN": 0.0001,
  "USDZAR": 0.0001,
  "USDTRY": 0.0001,
  "USDKRW": 0.01,

  // Paires en JPY (pip = 0.01)
  "USDJPY": 0.01,
  "EURJPY": 0.01,
  "GBPJPY": 0.01,
  "AUDJPY": 0.01,
  "NZDJPY": 0.01,
  "CHFJPY": 0.01,

  // Si tu utilises des clés avec slash, couvre-les aussi (alias non-breaking) :
  "CHF/JPY": 0.01,
};

// Helper safe
export const getPip = (symbol) => {
  if (symbol in PAIR_PIPS) return PAIR_PIPS[symbol];
  // Petits alias pratiques
  if (symbol?.includes("/")) {
    const noSlash = symbol.replace("/", "");
    if (noSlash in PAIR_PIPS) return PAIR_PIPS[noSlash];
  }
  return null; // inconnu → gère le fallback côté UI
};


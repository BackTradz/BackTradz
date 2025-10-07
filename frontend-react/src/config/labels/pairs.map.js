// [CHANGE: 2025-09-04] Front-only labels pour PAIRES (clé backend -> libellé UX)
const PAIRS_MAP = {

  //METAUX//
  "GC=F":   { label: "Gold Futures (GC=F)" },
  "XAUUSD": { label: "Gold (XAUUSD)" },
  "SI=F": { label:"Silver Futures (Argent)"},
  "PL=F": { label:"Platinum Futures (Platine)"},
  "HG=F": { label:"Copper Futures (Cuivre)"},

  // --- Énergie ---
  "CL=F": { label:"Crude Oil WTI Futures (Pétrole brut West Texas)"},
  "BZ=F": { label:"Brent Crude Oil Futures (Pétrole Brent)"},

  // --- Agricoles ---
  "ZC=F": { label:"Corn Futures (Maïs)"},

  // INDICES//
  "^AXJO": { label:"S&P/ASX 200 (Australie)"},
  "^BSESN": { label:"BSE Sensex (Inde)"},
  "^BVSP": { label:"Bovespa (Brésil)"},
  "^DJI": { label:"Dow Jones (USA)"},
  "^FCHI": { label:"CAC 40 (France)"},
  "^FTSE": { label:"FTSE 100 (UK)"},
  "^GDAXI": { label:"DAX 40 (Allemagne)"},
  "^GSPC": { label:"S&P 500 (USA)"},
  "^HSI": { label:"Hang Seng (Hong Kong)"},
  "^IXIC": { label:"NASDAQ Composite (USA)"},
  "^N225": { label:"Nikkei 225 (Japon)"},
  "^STOXX50E": { label:"Euro Stoxx 50 (Zone euro)"},

  //TAUX / VOLATILITE//
  "^TNX": { label:"T-Notes 10 ans (rendement, USA)"},
  "^VIX": { label:"Indice VIX (volatilité S&P 500)"},

  //CRYPTO//
  "BTC-USD": { label: "Bitcoin (BTC-USD)" },
  "ETH-USD": { label: "Ethereum (ETH-USD)" },

  //FOREX//
  "AUDCHF": { label: "AUD/CHF" },
  "AUDJPY": { label: "AUD/JPY" },
  "AUDUSD": { label: "AUD/USD" },
  "CHFJPY": { label: "CHF/JPY" },
  "EURAUD": { label: "EUR/AUD" },
  "EURCHF": { label: "EUR/CHF" },
  "EURGBP": { label: "EUR/GBP" },
  "EURJPY": { label: "EUR/JPY" },
  "EURUSD": { label: "EUR/USD" },
  "GBPCHF": { label: "GBP/CHF" },
  "GBPJPY": { label: "GBP/JPY" },
  "GBPUSD": { label: "GBP/USD" },
  "NZDJPY": { label: "NZD/JPY" },
  "NZDUSD": { label: "NZD/USD" },
  "USDCAD": { label: "USD/CAD" },
  "USDCHF": { label: "USD/CHF" },
  "USDHKD": { label: "USD/HKD" },
  "USDHUF": { label: "USD/HUF" },
  "USDILS": { label: "USD/ILS" },
  "USDJPY": { label: "USD/JPY" },
  "USDKRW": { label: "USD/KRW" },
  "USDMXN": { label: "USD/MXN" },
  "USDNOK": { label: "USD/NOK" },
  "USDPLN": { label: "USD/PLN" },
  "USDRUB": { label: "USD/RUB" },
  "USDSEK": { label: "USD/SEK" },
  "USDSGD": { label: "USD/SGD" },
  "USDTHB": { label: "USD/THB" },
  "USDTRY": { label: "USD/TRY" },
  "USDZAR": { label: "USD/ZAR" },


  // 🔧 Ajoute tes paires ici sans toucher au backend
};
export default PAIRS_MAP;


// --- Pips BackTradz (valeur du “pip” par symbole) ---
export const PAIR_PIPS = {
  "GC=F": 0.1, "XAUUSD": 0.1, "SI=F": 0.01, "PL=F": 0.1, "HG=F": 0.0005,
  "CL=F": 0.01, "BZ=F": 0.01, "ZC=F": 0.25,
  "^AXJO": 1, "^BSESN": 1, "^BVSP": 1, "^DJI": 1, "^FCHI": 1, "^FTSE": 1,
  "^GDAXI": 1, "^GSPC": 1, "^HSI": 1, "^IXIC": 1, "^N225": 1, "^STOXX50E": 1,
  "^TNX": 0.01, "^VIX": 0.1,
  "BTC-USD": 1, "ETH-USD": 0.01,
  "XRP-USD": 0.0001, "XRPUSD": 0.0001,   // ✅ crypto XRP
  "EURUSD": 0.0001, "GBPUSD": 0.0001, "AUDUSD": 0.0001, "NZDUSD": 0.0001,
  "USDCHF": 0.0001, "USDCAD": 0.0001, "USDSEK": 0.0001, "USDNOK": 0.0001,
  "USDSGD": 0.0001, "USDPLN": 0.0001, "USDILS": 0.0001, "USDHKD": 0.0001,
  "USDHUF": 0.01, "USDMXN": 0.0001, "USDZAR": 0.0001, "USDTRY": 0.0001,
  "USDKRW": 0.01,
  "USDJPY": 0.01, "EURJPY": 0.01, "GBPJPY": 0.01, "AUDJPY": 0.01,
  "NZDJPY": 0.01, "CHFJPY": 0.01,
  "CHF/JPY": 0.01, // alias si tu as des clés avec slash
};

export const getPip = (symbol) => {
  if (symbol in PAIR_PIPS) return PAIR_PIPS[symbol];
  if (symbol?.includes("/")) {
    const noSlash = symbol.replace("/", "");
    if (noSlash in PAIR_PIPS) return PAIR_PIPS[noSlash];
  }
  if (symbol?.includes("-")) {
    const noDash = symbol.replace("-", "");
    if (noDash in PAIR_PIPS) return PAIR_PIPS[noDash];
  }
  return null;
};
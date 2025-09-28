// src/pages/asavoir/a_savoir.jsx
import React from "react";
import "./a_savoir.css";
import { Link, useLocation } from "react-router-dom";


import { TOC } from "./composants/TOC";
import { Section } from "./composants/Section";
import TopProgress from "../../components/ui/progressbar/TopProgress";
import StrategyExplorer from "./composants/StrategyExplorer";
import STRATEGIES_MAP from "../../config/labels/strategies.map";
import PARAMS_MAP from "../../config/labels/params.map";
import STRATEGY_DOCS from "../../config/docs/strategies.docs";
import PairExplorer from "./composants/PairExplorer";

export default function ASavoirPage() {
  // ⚙️ Placeholder data – à compléter plus tard
  const strategies = [
    { key: "ob_pullback_pure", label: "OB pullback (pure)", tags: ["M5", "M15"], todo: true },
    { key: "fvg_pullback_multi", label: "FVG pullback (multi)", tags: ["M5", "M15"], todo: true },
    { key: "liquidity_grab", label: "Liquidity grab", tags: ["M5"], todo: true },
    { key: "breaker_ret", label: "Breaker + Retest", tags: ["M15"], todo: true },
  ];
  const location = useLocation();

  // Remonte en haut si pas de hash ; sinon scroll vers l’ancre avec offset
  React.useEffect(() => {
    const OFFSET = 90; // hauteur approx. du header/nav/sticky

    if (!location.hash) {
      // pas d’ancre => on repart tout en haut
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }

    const id = decodeURIComponent(location.hash.slice(1));
    // on attend un tick que le DOM soit peint (au cas où)
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset - OFFSET;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 0);

    return () => clearTimeout(t);
  }, [location.pathname, location.hash]);


  // ... à l’intérieur du composant ASavoirPage()
  const [loadingPage, setLoadingPage] = React.useState(true);
  React.useEffect(() => {
    // ici tu pourras brancher un vrai fetch (doc de strats) si besoin
  const t = setTimeout(() => setLoadingPage(false), 250); // mini feedback
  return () => clearTimeout(t);
  }, []);

  // ===== Helpers de matching doc <-> stratégie =====
  const norm = (s = "") =>
    s.toString()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accents
      .toLowerCase();

  const normalizeToken = (t) => {
    if (t === "pur") return "pure";     // OB(pur) => pure
    if (t === "gap") return "fvg";      // alias courant
    return t;
  };

  const tokenize = (s = "") =>
    norm(s)
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeToken);

  // Index des docs: par clé directe, par slug, par alias, et tokens
  const DOCS = STRATEGY_DOCS || {};
  const DOC_LIST = Object.entries(DOCS).map(([k, v]) => {
    const tokens = tokenize(k);
    const aliasTokens = (v.aliases || []).map(tokenize);
    return { key: k, doc: v, tokens, aliasTokens };
  });

  const resolveDoc = (key, meta) => {
    // 1) clé directe
    if (DOCS[key]) return DOCS[key];
    // 2) meta.docKey si présent
    if (meta?.docKey && DOCS[meta.docKey]) return DOCS[meta.docKey];

    // 3) matching fuzzy par tokens (clé + label + docKey)
    const candidates = [
      key,
      meta?.docKey || "",
      meta?.label || "",
   ].filter(Boolean);
    const wanted = tokenize(candidates.join(" "));

    let best = null;
    let bestScore = -1;
    for (const row of DOC_LIST) {
      // score sur clé
      const scoreKey = wanted.filter(t => row.tokens.includes(t)).length;
      // score max sur les aliases
      const scoreAlias = Math.max(
        0,
        ...row.aliasTokens.map(a => wanted.filter(t => a.includes(t)).length)
      );
      const score = Math.max(scoreKey, scoreAlias);
      if (score > bestScore) {
        bestScore = score;
        best = row.doc;
      }
    }
    // Petit seuil: dès qu'on a ≥2 tokens en commun, on considère que c'est le bon doc
    if (best && bestScore >= 2) return best;
    return {};
  };

  // Construit les fiches stratégies depuis mapping + docs (docs gagnent)
  const strategyDocs = React.useMemo(() => {
    return Object.entries(STRATEGIES_MAP).map(([key, meta]) => {
      const doc = resolveDoc(key, meta);
      const hasDoc = !!(doc.summary || (doc.entry?.length) || (doc.params?.length));
      return {
        key,
        label: meta.label || key,
        subtitle: meta.short || "",
        summary: doc.summary || "—",
        tags: doc.tags || [],
        entry: Array.isArray(doc.entry) ? doc.entry : [],
        params: Array.isArray(doc.params)
          ? doc.params.map(p => ({ name: p.name, desc: p.desc || "—" }))
          : [],
        todo: !hasDoc,
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, []);

  // Spécifications CSV (colonnes + exemple)
const csvCols = [
  { key: "Datetime", type: "ISO 8601 (UTC)", req: true,  desc: "Horodatage d’OUVERTURE de la bougie (ex. M15 = pas de 15 min)." },
  { key: "Open",     type: "number",         req: true,  desc: "Prix d’ouverture." },
  { key: "High",     type: "number",         req: true,  desc: "Plus haut de la bougie." },
  { key: "Low",      type: "number",         req: true,  desc: "Plus bas de la bougie." },
  { key: "Close",    type: "number",         req: true,  desc: "Prix de clôture." },
  { key: "Volume",   type: "number",         req: true,  desc: "Volume de la période (tel que fourni par la source ; peut être 0 si indisponible)." },
  { key: "RSI_14",   type: "number",         req: false, desc: "RSI (14 périodes) calculé par notre pipeline." },
];
const csvExample = "2025-05-01 03:15:00+00:00,1809.45,1812.07,1808.98,1812.07,653917184,25.89";


  return (
    <div className="a-savoir-page min-h-screen">
       <TopProgress active={loadingPage} height={3} from="#22d3ee" to="#6366f1" />

      {/* HERO */}
      <section className="a-savoir-hero">
        <div className="container-std">
          <h1 className="title"> À savoir</h1>
          <p className="subtitle">
            Référence BackTradz : stratégies, CSV, chandeliers, crédits, sécurité, FAQ.
          </p>
        </div>
      </section>

      {/* BODY */}
      <section className="container-std layout">
        {/* TOC sticky desktop */}
        <aside className="toc-wrap">
          <TOC
            items={[
              { id: "value", label: "Pourquoi BackTradz ?" },
              { id: "how-it-works", label: "Comment ça marche" },
              { id: "glossary", label: "Glossaire" },
              { id: "techniques", label: "Section techniques" },
              { id: "pairs", label: "Fiches paires" },
              { id: "upload-csv", label: "Upload CSV (custom)" },
              { id: "csv", label: "Spécifications CSV" },
              { id: "candles", label: "Qui sommes-nous" },
              { id: "credits", label: "Crédits & limites" },
              { id: "security", label: "Sécurité & responsabilités" },
              { id: "faq", label: "FAQ" },
            ]}
          />
        </aside>

        {/* Content */}
        <div className="content">

          {/* TOC mobile */}
          <TOC
            variant="mobile"
            items={[
              { id: "value", label: "Pourquoi BackTradz ?" },
              { id: "how-it-works", label: "Comment ça marche" },
              { id: "glossary", label: "Glossaire" },
              { id: "techniques", label: "Section techniques" },
              { id: "pairs", label: "Fiches paires" },
              { id: "upload-csv", label: "Upload CSV (custom)" },
              { id: "csv", label: "Spécifications CSV" },
              { id: "about-us", label: "Qui sommes-nous ?" },
              { id: "credits", label: "Crédits & limites" },
              { id: "security", label: "Sécurité & responsabilités" },
              { id: "faq", label: "FAQ" },
            ]}
          />


          {/* 0) VALUE PROP / TEASER */}
          <Section
            id="value"
            title=" Ce que BackTradz vous apporte"
            hint="Des décisions claires, fondées sur des milliers de backtests"
          >
            <div className="value-wrap">
              <p className="muted">
                BackTradz transforme des milliers de backtests en signaux utiles pour votre routine : 
                <b> quand trader</b>, <b>sur quels créneaux horaires</b>, <b>sur quelles sessions</b>, 
                et <b>dans quelles conditions</b> une stratégie donne le meilleur (ou le pire).
              </p>

              {/* 3 tuiles de valeur clés */}
              <div className="value-grid">
                <div className="value-card">
                  <div className="vc-title">Golden Hours</div>
                  <p>Identifiez les plages horaires où vos setups performent le plus (ex. <b>London Open</b>, post-<b>NY Open</b>…).</p>
                  <ul className="bullets">
                    <li>Heures & sessions gagnantes</li>
                    <li>Volatilité moyenne</li>
                    <li>Taux de réussite par créneau</li>
                  </ul>
                </div>

                <div className="value-card">
                  <div className="vc-title">Contexte & filtrage</div>
                  <p>Comprenez <b>quand ne pas entrer</b> : tendances contraires, volatilité trop faible/forte, jours défavorables.</p>
                  <ul className="bullets">
                    <li>Jours de la semaine</li>
                    <li>Régimes (range / trend)</li>
                    <li>Filtres directionnels</li>
                  </ul>
                </div>

                <div className="value-card">
                  <div className="vc-title">Clarté actionnable</div>
                  <p>Pas de blabla — des <b>résumés lisibles</b>, des <b>statistiques</b> et des <b>.xlsx</b> prêts à exploiter.</p>
                  <ul className="bullets">
                    <li>Top créneaux par stratégie</li>
                    <li>Worst-case à éviter</li>
                    <li>Export & traçabilité</li>
                  </ul>
                </div>
              </div>

              {/* Appels à l’action internes */}
              <div className="value-cta">
                <Link to="/backtest" className="btn-primary">Lancer un backtest</Link>
                <Link to="/csv-shop" className="btn-ghost">Explorer les CSV</Link>
              </div>
            </div>
          </Section>

          {/* 0.1) COMMENT ÇA MARCHE */}
          <Section
            id="how-it-works"
            title=" Comment ça marche"
            hint="Du choix de la paire au lancement du backtest"
          >
            <div className="steps-grid">
              <div className="step">
                <div className="step-num">1</div>
                <div className="step-body">
                  <div className="step-title">Choisissez une paire & un timeframe</div>
                  <p className="muted">
                    Utilisez nos <b>données officielles</b> ou importez un <b>CSV custom</b>.
                    Le timeframe (ex. M5, M15, H1) détermine la granularité de votre test.
                  </p>
                </div>
              </div>

              <div className="step">
                <div className="step-num">2</div>
                <div className="step-body">
                  <div className="step-title">Sélectionnez une stratégie</div>
                  <p className="muted">
                    Ex. <b>FVG impulsive</b>, <b>Englobante</b>, leurs variantes <b>RSI</b> et/ou <b>EMA</b>.
                    Le filtre <b>tendance EMA</b> utilise deux moyennes <i>(ema_fast / ema_slow)</i> pour la tendance.
                  </p>
                </div>
              </div>

              <div className="step">
                <div className="step-num">3</div>
                <div className="step-body">
                  <div className="step-title">Définissez la période d’analyse</div>
                  <p className="muted">
                    Choisissez la <b>fenêtre temporelle</b> (dates de début/fin) sur laquelle exécuter le backtest.
                  </p>
                </div>
              </div>

              <div className="step">
                <div className="step-num">4</div>
                <div className="step-body">
                  <div className="step-title">Renseignez les paramètres</div>
                  <p className="muted">
                    Ajustez les paramètres dynamiques de la stratégie (<b>min_pips</b>, <b>ema_fast</b>, <b>ema_slow</b>,
                    <b> rsi_threshold</b>…). Les champs techniques (ex. pips internes) sont gérés par le runner.
                  </p>
                </div>
              </div>

              <div className="step">
                <div className="step-num">5</div>
                <div className="step-body">
                  <div className="step-title">Définissez votre gestion du risque</div>
                  <p className="muted">
                    Spécifiez au minimum un <b>stop-loss</b> (en pips). Et un <b>take-profit</b>.
                  </p>
                </div>
              </div>

              <div className="step">
                <div className="step-num">6</div>
                <div className="step-body">
                  <div className="step-title">Lancez le backtest</div>
                  <p className="muted">
                    Analysez les résultats (taux de réussite, timing, sessions, etc.). Les <b>timeframes plus élevés</b> sont souvent
                    plus <b>stables</b> et peuvent afficher un meilleur <b>win-rate</b> — à vous d’essayer.
                  </p>
                </div>
              </div>
            </div>
          </Section>


            {/* 1) GLOSSAIRE */}
          <div className="content">
          <Section id="glossary" title=" Glossaire" hint="Notions de base">
            <ul className="bullets">
              <li><b>OB (Order Block)</b> : zone créée par une bougie clé avant un mouvement impulsif.</li>
              <li><b>FVG (Fair Value Gap)</b> : “trou” entre High/Low non recouvert par la bougie suivante.</li>
              <li><b>EMA</b> : moyenne mobile exponentielle (réagit plus vite que la SMA).</li>
              <li><b>RSI</b> : indicateur de momentum borné [0–100].</li>
              <li><b>Pip</b> : plus petit incrément (ex : GBPUSD 1 pip = 0.0001 ; XAUUSD 1 pip ≈ 0.1$).</li>
            </ul>
          </Section>

          {/* 2) TECHNIQUES (Fiches stratégies) */}
          <Section id="techniques" title=" Section techniques" hint={`${strategyDocs.length} fiches`}>
            <StrategyExplorer strategies={strategyDocs} variant="select" />
          </Section>

          {/* 2.1) TECHNIQUES (Fiches paires) */}
          <Section id="pairs" title=" Fiches paires" hint="Sélectionne une paire pour afficher sa fiche">
            <PairExplorer />
          </Section>

          {/* 2bis) UPLOAD CSV (custom) */}
          <Section
            id="upload-csv"
            title=" Upload CSV (custom)"
            hint="Guide & format attendu"
          >
            <div className="csv-spec">
              <p className="muted">
                Pour backtester votre propre fichier, le runner attend un CSV propre et
                minimal. Les colonnes <b>obligatoires</b> sont :{" "}
                <code>Datetime, Open, High, Low, Close, Volume</code>. Les colonnes
                additionnelles (ex. <code>RSI_14</code>, <code>EMA_50</code>) sont
                ignorées par défaut, sauf cas spécifiques documentés par stratégie.
              </p>

              {/* tableau des colonnes attendues */}
              <table className="spec-table">
                <thead>
                  <tr>
                    <th>Colonne</th><th>Type</th><th>Oblig.</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {csvCols.map((c) => (
                    <tr key={`upload-${c.key}`}>
                      <td><code>{c.key}</code></td>
                      <td>{c.type}</td>
                      <td>{c.req ? "Oui" : "Non"}</td>
                      <td>{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* exemple minimal */}
              <div className="csv-example">
                <div className="lbl">Exemple minimal</div>
                <textarea
                  className="mono"
                  rows={3}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  value={[
                    "Datetime,Open,High,Low,Close,Volume",
                    csvExample, // ex: 2025-05-01 03:15:00+00:00,1809.45,...
                  ].join("\n")}
                />
              </div>

              {/* règles de validation */}
              <div className="blk">
                <div className="blk-title">Règles de validation côté runner</div>
                <ul className="bullets">
                  <li><b>Fuseau horaire</b> : <code>UTC (+00:00)</code>. Le timestamp correspond à l’<b>OUVERTURE</b> de la bougie.</li>
                  <li><b>Séparateur</b> : virgule · <b>Encodage</b> : UTF-8.</li>
                  <li><b>Tri</b> : lignes classées par datetime <b>croissant</b> (aucun doublon).</li>
                  <li><b>Timeframe</b> : pas de temps <b>constant</b> (M1, M5, M15, H1…).</li>
                  <li>Décimales avec un <b>point</b> (<code>1234.56</code>), pas de virgule <code>,</code>.</li>
                  <li>En-têtes exactes et sensibles à la casse : <code>Datetime</code>, <code>Open</code>, …</li>
                  <li>Une éventuelle 2ᵉ ligne d’en-tête (symbole sous chaque colonne) peut être ignorée au chargement
                    (<code>skiprows=[1]</code>).</li>
                </ul>
              </div>

              {/* erreurs classiques */}
              <div className="blk">
                <div className="blk-title">Erreurs classiques & corrections</div>
                <ul className="bullets">
                  <li><b>Datetime local</b> → convertir en UTC : voir snippet ci-dessous.</li>
                  <li><b>Doublons</b> (même timestamp) → supprimer ou agréger (keep=first).</li>
                  <li><b>Colonnes mal nommées</b> (ex. <code>date</code>, <code>open_time</code>) → renommer.</li>
                  <li><b>Séparateur point-virgule</b> → convertir en virgule.</li>
                </ul>
              </div>

              {/* snippets utiles */}
              <div className="code-block">
                <div className="lbl">Chargement propre (pandas)</div>
                <pre>
                  <code>{`import pandas as pd

          # si votre CSV a une 2e ligne d'en-tête (symbole), ignorez-la :
          df = pd.read_csv("data.csv", skiprows=[1])

          # renommez si besoin :
          df = df.rename(columns={
              "Date": "Datetime", "Open": "Open", "High": "High",
              "Low": "Low", "Close": "Close", "Volume": "Volume"
          })

          # parse & UTC (si vos dates étaient locales, adaptez 'Europe/Paris' → 'UTC')
          df["Datetime"] = pd.to_datetime(df["Datetime"], utc=False, errors="raise")
          if df["Datetime"].dt.tz is None:
              # vos dates sont naïves : précisez d'abord leur timezone d'origine si nécessaire
              # df["Datetime"] = df["Datetime"].dt.tz_localize("Europe/Paris")
              df["Datetime"] = df["Datetime"].dt.tz_localize("UTC")
          else:
              df["Datetime"] = df["Datetime"].dt.tz_convert("UTC")

          # tri + déduplication
          df = df.sort_values("Datetime").drop_duplicates("Datetime", keep="first")

          # vérif colonnes obligatoires
          required = ["Datetime","Open","High","Low","Close","Volume"]
          missing = [c for c in required if c not in df.columns]
          assert not missing, f"Colonnes manquantes: {missing}"

          df.to_csv("data_clean.csv", index=False)`}</code>
                </pre>
              </div>

              <p className="muted">
                Besoin d’un exemple prêt à l’emploi ? Télécharge un CSV depuis le{" "}
                <Link to="/csv-shop" className="link">CSV Shop</Link>, ou utilise l’exemple ci-dessus
                comme gabarit. Depuis la page <Link to="/backtest" className="link">Backtest</Link>,
                un lien “Guide d’upload CSV” renvoie directement ici.
              </p>
            </div>
          </Section>


          {/*3 specifications CSV*/}
          <Section id="csv" title=" Spécifications CSV" hint="Format de nos fichiers officiels">
            <div className="csv-spec">
              <p className="muted">
                Nos CSV officiels sont extraits de <b>Yahoo Finance</b> (via yfinance), puis
                <b> nettoyés</b> et <b>harmonisés</b> (timeframe & fuseau identiques). Chaque fichier
                correspond à <b>une paire</b> et <b>un timeframe</b>.
              </p>

              <table className="spec-table">
                <thead>
                  <tr>
                    <th>Colonne</th><th>Type</th><th>Oblig.</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {csvCols.map(c => (
                    <tr key={c.key}>
                      <td><code>{c.key}</code></td>
                      <td>{c.type}</td>
                      <td>{c.req ? "Oui" : "Non"}</td>
                      <td>{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="csv-example">
                <div className="lbl">Exemple de ligne</div>
                <input
                  className="mono"
                  readOnly
                  value={csvExample}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <ul className="bullets">
                <li><b>Fuseau horaire</b> : <code>UTC (+00:00)</code>.</li>
                <li>Une 2<sup>e</sup> ligne d’en-tête indique le <i>symbole</i> sous les colonnes prix/volume
                  (ex. <code>ETH-USD</code>) — elle peut être ignorée au chargement.</li>
                <li><b>Séparateur</b> : virgule · <b>Encodage</b> : UTF-8.</li>
              </ul>

              <div className="code-block">
                <div className="lbl">Chargement avec pandas</div>
                <pre><code>pd.read_csv("data.csv", skiprows=[1], parse_dates=["Datetime"])</code></pre>
              </div>
            </div>
          </Section>

          {/*Qui sommes-nous*/}
          <Section id="about-us" title=" Qui sommes-nous ?" hint="Notre vision">
            <p>
              <b>BackTradz</b>, c’est avant tout une équipe de <b>traders et développeurs</b> réunis par une passion commune :
              créer des outils intelligents, précis et accessibles pour la communauté.
            </p>
            <p className="muted">
              Notre mission est simple : <b>aider les traders, par des traders</b>.  
              Nous concevons des solutions professionnelles — backtests, données fiables, automatisations — 
              pour permettre à chacun d’analyser, tester et progresser avec clarté et confiance.
            </p>
            <p className="muted">
              Pas de promesses irréalistes, juste du concret : des résultats mesurables, une approche transparente,
              et une vision long terme tournée vers l’excellence.
            </p>
          </Section>

          {/* section credit*/}
              <Section id="credits" title=" Crédits & limites" hint="Système de consommation & abonnements">
                <div className="blk">
                  <div className="blk-title">Comment fonctionnent les crédits ?</div>
                  <ul className="bullets">
                    <li>Extraire un CSV consomme <b>1 crédit</b>.</li>
                    <li>Lancer un backtest consomme <b>2 crédits</b>.</li>
                    <li><b>3 crédits</b> sont offerts à l’inscription.</li>
                    <li>Les crédits sont disponibles via <b>packs one-shot</b> ou via <b>abonnements</b> mensuels.</li>
                    <li>Un crédit non utilisé reste disponible : il n’expire pas.</li>
                  </ul>
                </div>

            <div className="blk">
              <div className="blk-title">Packs disponibles</div>
              <ul className="bullets">
                <li>💠 5 € → <b>5 crédits</b></li>
                <li>💠 10 € → <b>12 crédits</b></li>
                <li>💠 20 € → <b>25 crédits</b></li>
                <li>💠 50 € → <b>75 crédits</b></li>
              </ul>
            </div>

            <div className="blk">
              <div className="blk-title">Abonnements mensuels</div>
              <ul className="bullets">
                <li><b>Starter</b> (9 €/mois) → 10 crédits / mois + <span className="badge">-10% sur les packs</span></li>
                <li><b>Pro</b> (25 €/mois) → 30 crédits / mois + <span className="badge">-10% sur les packs</span> + <b>priorité backtest</b></li>
              </ul>
            </div>

            <div className="blk">
              <div className="blk-title">Limites & règles</div>
              <ul className="bullets">
                <li>Les crédits offerts par abonnement sont rechargés <b>tous les 30 jours</b>, à la date de souscription.</li>
                <li>Les crédits ne sont pas remboursables une fois consommés.</li>
              </ul>
            </div>
            <p className="muted">
                💡 Nous sommes également ouverts à vos retours : 
                n’hésitez pas à partager vos <b>idées d’amélioration</b> ou à signaler un bug 
                directement depuis la page <Link to="/support" className="link">Support</Link>.
              </p>
          </Section>

          {/* section sécurité et crédits*/}
          <Section id="security" title=" Sécurité & responsabilités" hint="Règles & transparence">
            <div className="blk">
              <p>
                La sécurité de vos données et la transparence sont au cœur de notre démarche.
                <b> BackTradz</b> propose des outils d’analyse et de backtest conçus pour aider les traders à progresser,
                mais ne fournit en aucun cas de conseils financiers personnalisés.
              </p>
              <p className="muted">
                Chaque utilisateur reste responsable de ses décisions et de sa gestion du risque.  
                Nos services visent à vous donner les meilleures données et insights, 
                mais le trading comporte toujours une part de risque.
              </p>
            </div>

            <div className="blk">
              <div className="blk-title">Documents légaux</div>
              <ul className="bullets">
                <li><Link to="/legal/mentions-legales" className="link">Mentions légales</Link></li>
                <li><Link to="/legal/politique-confidentialite" className="link">Politique de confidentialité</Link></li>
                <li><Link to="/legal/cgu" className="link">Conditions générales</Link></li>
              </ul>
            </div>
          </Section>

          {/* section FAQ*/}
          <Section id="faq" title="❓ FAQ" hint="Questions fréquentes" >
            <div className="faq">
              <details open>
                <summary>Comment importer mon CSV ?</summary>
                <div className="answer">
                  <p>
                    Va dans <Link to="/backtest" className="link">Backtest</Link> puis clique sur
                    <b> Importer un CSV</b>. Format attendu :
                    <code>Datetime,Open,High,Low,Close,Volume[,RSI_14]</code> en <b>UTC</b>, séparateur virgule.
                    Tu peux ignorer la 2ᵉ ligne d’en-tête avec
                    <code>pd.read_csv(..., skiprows=[1])</code>.
                  </p>
                </div>
              </details>

              <details>
                <summary>Mon backtest avec ma CSV upload ne démarre pas, que faire ?</summary>
                <div className="answer">
                  <ul className="bullets">
                    <li>Vérifie que le fichier est bien au format CSV (UTF-8, séparateur virgule).</li>
                    <li>Assure-toi que la colonne <code>Datetime</code> est bien en UTC et parseable.</li>
                    <li>Choisis une <b>stratégie</b> et un <b>timeframe</b> compatibles avec tes données.</li>
                    <li>Vérifie que tu as au moins <b>2 crédit</b> disponible.</li>
                  </ul>
                  <p className="muted">Si ça persiste, contacte-nous (voir dernière question).</p>
                </div>
              </details>

              <details>
                <summary>Combien de crédits coûte une action ?</summary>
                <div className="answer">
                  <p> le téléchargement de CSV consomme <b>1 crédit</b></p>
                  <p> lancement d’un backtest consomme <b>2 crédit</b>.</p>
                  <p className="muted">Même principe pour les abonnés : pas de crédits illimités.</p>
                </div>
              </details>

              <details>
                <summary>Mes crédits se rechargent comment avec l’abonnement ?</summary>
                <div className="answer">
                  <p>Les crédits inclus se rechargent automatiquement <b>tous les 30 jours</b> à la date de souscription.</p>
                  <p>Tu peux suivre ton solde depuis <Link to="/profile" className="link">Mon profil</Link> et dans la navbar.</p>
                </div>
              </details>

              <details>
                <summary>Où récupérer mon fichier .xlsx de résultats ?</summary>
                <div className="answer">
                  <p>Après un backtest, va dans <Link to="/dashboard" className="link">Dashboard</Link> → onglet <b>Mes backtests</b>,
                  puis clique sur <b>Télécharger (.xlsx)</b> sur la ligne dédiée.</p>
                </div>
              </details>

              <details>
                <summary>Quels symboles et timeframes sont pris en charge ?</summary>
                <div className="answer">
                  <p>Pairs crypto, forex, indices et matières premières disponibles varient selon la data. Les timeframes
                  standard (ex./M5/M15/H1) sont supportés. Réfère-toi à la fiche de ta paire dans le
                  <Link to="/csv-shop" className="link"> CSV Shop</Link> pour les détails.</p>
                </div>
              </details>

              <details>
                <summary>Quel est le fuseau horaire des données ?</summary>
                <div className="answer">
                  <p>Toutes les données sont harmonisées en <b>UTC</b>. Le <code>Datetime</code> correspond à l’OUVERTURE de la bougie.</p>
                </div>
              </details>

               <details>
                <summary>Est'il possible de backtest du M1</summary>
                <div className="answer">
                  <p>il est possible d'extraire du M1 dans <b>l'extracteur</b>max <b>3 semaine avant pour M1</b> et d'upload la CSV</p>
                </div>
              </details>

              <details>
                <summary>D’où viennent vos données ?</summary>
                <div className="answer">
                  <p>Les CSV vendus sont extraits de <b>Yahoo Finance</b> (via yfinance), puis <b>nettoyés et alignés</b> (colonnes, timezone, TF).
                  Voir <Link to="#csv" className="link">Spécifications CSV</Link> pour le format exact.</p>
                </div>
              </details>

              <details>
                <summary>Différence entre “Mes CSV” et “CSV Shop” ?</summary>
                <div className="answer">
                  <ul className="bullets">
                    <li><b>Mes CSV</b> : tes fichiers achetés/téléchargés, prêts à l’usage.</li>
                    <li><b>CSV Shop</b> : catalogue pour acheter des CSV propres et harmonisés.</li>
                  </ul>
                </div>
              </details>

              <details>
                <summary>Problème de connexion (Google, e-mail/mot de passe) ?</summary>
                <div className="answer">
                  <ul className="bullets">
                    <li>Assure-toi que les pop-ups ne sont pas bloquées (connexion Google).</li>
                    <li>Vérifie l’e-mail de confirmation si tu utilises un compte classique.</li>
                    <li>Essaie de te reconnecter depuis <Link to="/auth" className="link">/auth</Link>.</li>
                  </ul>
                </div>
              </details>

              <details>
                <summary>Support — comment nous contacter ?</summary>
                <div className="answer">
                  <p>Écris-nous via le formulaire de contact (ou depuis <Link to="/profile" className="link">Mon profil</Link> → support).
                  Donne un maximum d’infos : paire, TF, période, capture d’écran et message d’erreur.</p>
                </div>
              </details>
            </div>
          </Section>


        </div>
        </div>
        </section>
      </div>

  );
}


# src/components/a_savoir

Composants UI de la page “À savoir” (documentation embarquée des paires & stratégies).

## Contenu

- **PairExplorer.jsx**  
  Explorateur des **paires**.  
  - Select des paires (triées par label, collation `fr`).  
  - Lecture de l’URL `?pair=SYMBOL` (deep-link) et mise à jour via `history.replaceState`.  
  - Fiche documentaire par paire (`PAIR_DOCS[SYMBOL]`) avec `summary`, `specs`, `notes`, `links`.  
  - Affiche aussi la taille de **pip** via `getPip`.  
  - Auto-scroll conditionnel vers le détail (deep-link, hash ou sélection manuelle).  
  - Accessibilité : `role="tabpanel"` + `aria-live="polite"`.

- **StrategyExplorer.jsx**  
  Explorateur des **stratégies**.  
  - Liste les stratégies fournies en prop (`strategies = []`).  
  - Deep-link via `?strat=KEY` et MAJ de l’URL lors de la sélection.  
  - Détail d’une stratégie : `label`, `subtitle`, `tags`, `summary`, `entry[]`, `params[]`.  
  - Auto-scroll conditionnel, comme `PairExplorer`.  
  - Accessibilité : `role="tabpanel"` + sémantique (titres/listes/table).

- **Section.jsx**  
  Wrapper standard de **section**.  
  - `id` (ancre), `title`, `hint?`, `children`.  
  - Utilisé pour structurer la page et être ciblé par le **TOC**.

- **TOC.jsx**  
  Sommaire (Table of Contents).  
  - `variant="mobile"` : panneau `<details>` repliable.  
  - `variant="sidebar"` : liste verticale.  
  - Les `items = [{ id, label }]` doivent correspondre aux ids des `<Section />`.

## Flux & Deep-link

- Les explorateurs lisent la query string (`?pair=`, `?strat=`) au montage pour sélectionner l’élément voulu.  
- À chaque sélection dans le `<Select>`, l’URL est réécrite via `history.replaceState` pour être partageable.  
- Un auto-scroll (avec offset ~90px pour header sticky) amène l’utilisateur au bloc de détail dans ces cas :
  - deep-link initial (`?pair=` ou `?strat=`),
  - présence d’un `#hash` à l’arrivée,
  - changement manuel de sélection.

## Dépendances & Config

- **Select** (composant interne) doit accepter `{ value, label }` et `onChange(value)`.  
- **PAIRS_MAP / getPip** et **PAIR_DOCS** doivent être définis dans `src/config`.  
- Si le nom des query strings change, adapter `pair` et `strat` dans les composants.

## Accessibilité

- Usage de `role="tabpanel"`, `aria-live="polite"` et d’éléments sémantiques (`h3`, `h4`, `ul`, `table`).  
- Le TOC version mobile repose sur `<details>/<summary>` (comportement natif accessible).

## Pièges connus

- Si une clé sélectionnée n’existe pas dans la source (PAIRS_MAP/strategies), l’état reste vide (`muted`).  
- Les liens dans `PAIR_DOCS.links` doivent être sûrs (URLs valides).  
- L’offset de scroll (90px) est “magique” et dépend du header : si le design change, pensez à l’ajuster.

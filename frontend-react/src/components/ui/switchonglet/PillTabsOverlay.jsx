// Wrapper propre qui applique le variant "overlay" au composant unique
import PillTabs from "./PillTabs";             // même dossier que le composant de base
import "./PillTabsOverlay.css";                // thème overlay (ne change QUE le visuel)

export default function PillTabsOverlay(props){
  return <PillTabs {...props} variant="overlay" />;
}
import { Outlet } from "react-router-dom";
import Navbar from "../components/ui/navbar/Navbar";
import Footer from "../components/ui/footer/Footer";
import TopProgress from "../components/ui/progressbar/TopProgress";
// [v1.3 - retouche design] fond hex animé
import HexNeonBackground from "../components/background/HexNeonBackground";

export default function AppLayout() {
  return (
    <>
      {/* ✅ classe 'app-layout' pour appliquer le padding-bottom global */}
      {/* [v1.3] wrapper isolé = nouveau stacking context pour contrôler les z-index */}
      <div className="app-layout relative flex flex-col min-h-[100svh] md:min-h-screen bg-bg text-textMain isolate">
        {/* [v1.3] le canvas vit DANS le layout, donc derrière tous ses enfants */}
        <HexNeonBackground />

        <Navbar />

        {/* [v1.3] contenu au-dessus du canvas */}
        <main className="relative z-[1] flex-grow w-full max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </>
  );
}

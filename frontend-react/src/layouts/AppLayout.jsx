import { Outlet, useNavigation } from "react-router-dom";
import Navbar from "../components/ui/navbar/Navbar";
import Footer from "../components/ui/footer/Footer";
import TopProgress from "../components/ui/progressbar/TopProgress"; 


   export default function AppLayout() { 
    
    return ( 
    
    <div className="flex flex-col min-h-screen bg-bg text-textMain">
       <Navbar /> 
       <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6"> 
        <Outlet /> 
      </main> 
    <Footer /> 
    </div> 
    ); 
  }
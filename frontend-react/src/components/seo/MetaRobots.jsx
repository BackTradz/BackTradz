import { useEffect } from "react";
 
export default function MetaRobots({ content = "index,follow" }) {
   useEffect(() => {
     const head = document.head || document.getElementsByTagName("head")[0];
     let tag = head.querySelector('meta[name="robots"]');
     if (!tag) {
       tag = document.createElement("meta");
       tag.setAttribute("name", "robots");
       head.appendChild(tag);
     }
     const prev = tag.getAttribute("content");
     tag.setAttribute("content", content);
     return () => {
       if (prev) tag.setAttribute("content", prev);
       else tag.remove();
     };
   }, [content]);
   return null;
 }

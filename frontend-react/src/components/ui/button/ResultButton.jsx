import React from "react";
import "./ResultButton.css";

export default function ResultButton({
   children = "Voir les résultats",
   onClick,
   href,
   disabled = false,
   fullWidth = false,
   className = "",
   type = "button",
   ...rest
 }) {
   const cls = [
     "result-btn",
     fullWidth ? "result-btn--block" : "",
     className,
   ].join(" ").trim();

   const Inner = (
     <>
      <span className="result-btn__label">{children}</span>
       <span aria-hidden className="result-btn__ic">›</span>
     </>
   );

   if (href) {
     return (
       <a
         href={href}
         className={cls}
         aria-disabled={disabled || undefined}
         onClick={disabled ? (e)=>e.preventDefault() : onClick}
        {...rest}
      >
         {Inner}
       </a>
     );
   }

   return (
     <button
       type={type}
       className={cls}
       onClick={onClick}
       disabled={disabled}
       {...rest}
     >
       {Inner}
     </button>
   );
 }
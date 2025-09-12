// src/components/ui/Button.jsx
export default function Button({ children, onClick, className = "", ...props }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

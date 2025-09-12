export default function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-card p-6 shadow-md ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-textMain">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

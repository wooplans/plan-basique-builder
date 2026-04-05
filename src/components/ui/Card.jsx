export default function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border-2 border-brown shadow-lg p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-bold text-brown mb-4 border-b-2 border-gold pb-2">{title}</h3>
      )}
      {children}
    </div>
  );
}
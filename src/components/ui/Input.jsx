export default function Input({ label, value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-semibold text-brown">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="px-4 py-2 border-2 border-brown rounded-lg bg-white focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
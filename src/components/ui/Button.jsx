export default function Button({ children, onClick, disabled, variant = 'primary', className = '' }) {
  const baseClasses = 'px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brown text-white hover:bg-opacity-90 border-2 border-brown',
    secondary: 'bg-cream text-brown border-2 border-brown hover:bg-brown hover:text-white',
    outline: 'border-2 border-gold text-gold hover:bg-gold hover:text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
import './HamburgerButton.css';

export default function HamburgerButton({ isOpen, onClick }) {
  return (
    <button className={`hamburger-btn ${isOpen ? 'open' : ''}`} onClick={onClick}>
      <span className="bar top"></span>
      <span className="bar middle"></span>
      <span className="bar bottom"></span>
    </button>
  );
}

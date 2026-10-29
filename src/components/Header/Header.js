import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

export default function Header({ company = 'STARLINE LI' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleNavigationKeyDown(event) {
    if (event.key === 'Escape') {
      closeMenu();
      menuButtonRef.current?.focus();
    }
  }

  return (
    <header className="site-header">
      <NavLink to="/" className="header-brand" onClick={closeMenu}>
        <img src="/media/Logo_V1.00_transparent_00171f.png" alt="" />
        <span className="header-brand-name">{company}</span>
      </NavLink>
      <button
        ref={menuButtonRef}
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? 'Close' : 'Menu'}
        <span aria-hidden="true">{menuOpen ? '\u00d7' : '\u2630'}</span>
      </button>
      <nav
        id="primary-navigation"
        aria-label="Main navigation"
        className={`header-nav${menuOpen ? ' is-open' : ''}`}
        onClick={closeMenu}
        onKeyDown={handleNavigationKeyDown}
      >
        <NavLink to="/about-us">About Us</NavLink>
        <NavLink to="/contact-us">Contact Us</NavLink>
        <NavLink to="/products">Products</NavLink>
      </nav>
    </header>
  );
}

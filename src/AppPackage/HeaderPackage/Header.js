import PropTypes from "prop-types"
import { NavLink } from "react-router-dom"
import { useState } from "react"

const Header = ({ company }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header>
      <NavLink to="/" className={"logo_container"} onClick={() => setMenuOpen(false)}>
        <img src="/media/Logo_V1.00_transparent_00171f.png" alt="" />
        <h1>{company}</h1>
      </NavLink>
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
      <nav id="primary-navigation" aria-label="Main navigation" className={`nav_container${menuOpen ? ' is-open' : ''}`} onClick={() => setMenuOpen(false)} onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); document.querySelector('.menu-toggle').focus(); } }}>
        <NavLink to="/about-us">About Us</NavLink>
        <NavLink to="/contact-us">Contact Us</NavLink>
        <NavLink to="/products">Products</NavLink>
      </nav>
    </header>
  )
}

Header.defaultProps = {
  company: 'STARLINE LI',
}

Header.propTypes = {
  company: PropTypes.string,
}

export default Header

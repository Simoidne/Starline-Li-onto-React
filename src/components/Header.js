import PropTypes from "prop-types"
import { NavLink } from "react-router-dom"

const Header = ({ company }) => {
  return (
    <header>
      <NavLink to="/" className={"logo_container"}>
        <img src="media/Logo_V1.00_transparent_purple.png" alt="" />
        <h1>{company}</h1>
      </NavLink>
      <div className="nav_container">
        <NavLink to="/about-us">About Us</NavLink>
        <NavLink to="/contact-us">Contact Us</NavLink>
        <NavLink to="/products">Products</NavLink>
      </div>
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
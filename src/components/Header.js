import PropTypes from "prop-types"

const Header = ({ company }) => {
  return (
    <header>
      <a className="logo_container" href="index.html">
        <img src="media/logo192.png" alt="" />
        <h1>{company}</h1>
      </a>
      <div className="nav_container">
        <a href="about-us.html">About Us</a>
        <a href="contact-us.html">Contact Us</a>
        <a href="products.html">Products</a>
      </div>
    </header>
  )
}

Header.defaultProps = {
  company: 'Starline Li',
}

Header.propTypes = {
  company: PropTypes.string,
}

export default Header
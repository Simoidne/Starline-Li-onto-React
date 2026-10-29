import { Link } from 'react-router-dom';

function HomeContents() {
  return (
    <div className="home-content">
      <section className="content_box">
        <h2>Featured Products</h2>
        <p>Explore our seafood selection for retail and wholesale.</p>
        <Link className="text-link" to="/products">Explore products →</Link>
      </section>
      <section className="small_banner">
        <h2>Browse Online</h2>
        <p>Discover more about Starline Li and what we do.</p>
        <Link className="text-link" to="/about-us">Get to know us →</Link>
      </section>
    </div>
  );
}
export default HomeContents;

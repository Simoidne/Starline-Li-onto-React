import { Link } from 'react-router-dom';
import Slideshow from './Slideshow';
import './Home.css';

export default function Home() {
  return (
    <>
      <h1 className="visually-hidden">Starline Li seafood</h1>
      <Slideshow />
      <div className="home-content">
        <section className="home-card">
          <h2>Featured Products</h2>
          <p>Explore our seafood selection for retail and wholesale.</p>
          <Link className="text-link" to="/products">
            Explore products &rarr;
          </Link>
        </section>
        <section className="home-card">
          <h2>Browse Online</h2>
          <p>Discover more about Starline Li and what we do.</p>
          <Link className="text-link" to="/about-us">
            Get to know us &rarr;
          </Link>
        </section>
      </div>
    </>
  );
}

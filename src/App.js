import { Link, Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';
import AboutUs from './pages/AboutUs/AboutUs';
import ContactUs from './pages/ContactUs/ContactUs';
import Home from './pages/Home/Home';
import Products from './pages/Products/Products';

export default function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/products" element={<Products />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <section className="page-shell">
      <h1>Page not found</h1>
      <p>We could not find the page you were looking for.</p>
      <Link className="text-link" to="/">
        Return home
      </Link>
    </section>
  );
}

import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import './Products.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError('');
    fetch('/api/index.php?action=catalog', {
      signal: controller.signal,
      credentials: 'omit',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Catalog unavailable');
        const data = await response.json();
        if (!Array.isArray(data.products)) throw new Error('Invalid catalog');
        if (active) setProducts(data.products);
      })
      .catch(() => {
        if (active)
          setError(
            'Our product selection is temporarily unavailable. Please try again or contact us.',
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  return (
    <section className="page-shell products-page">
      <h1>Products</h1>
      <p className="products-intro">
        Explore our seafood selection. Contact us for availability and ordering.
      </p>
      {loading ? (
        <p role="status">Loading products…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt(attempt + 1)}>Try again</button>
        </div>
      ) : !products.length ? (
        <p>Our selection is being updated. Please contact us for available products.</p>
      ) : (
        <>
          <p className="products-hint">Hover, focus, or tap a photo to learn more.</p>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

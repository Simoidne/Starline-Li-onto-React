import ProductCard from './ProductCard';
import { products } from './productData';
import './Products.css';

export default function Products() {
  return (
    <section className="page-shell products-page">
      <h1>Products</h1>
      <p className="products-intro">
        A little inspiration for your next meal. Explore our sample seafood selection.
      </p>
      <p className="products-hint">
        Hover, focus, or tap a photo to learn more. Products and photos are placeholders.
      </p>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

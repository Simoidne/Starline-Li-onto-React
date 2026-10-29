import { useState } from 'react';
import './products.css';

// Sample products and stock photography for the layout preview.
const products = [
  { name: 'Atlantic Salmon', image: 'photo-1510130387422-82bed34b37e9', alt: 'A prepared salmon dish', description: 'Rich, tender salmon for a simple pan-seared dinner or a special weekend meal. Pair with lemon, herbs, and your favourite sides.' },
  { name: 'Jumbo Shrimp', image: 'photo-1559737558-2f5a35f4523b', alt: 'Shrimp served with herbs and seasoning', description: 'A versatile favourite for garlic shrimp, colourful skewers, or a generous seafood pasta. A little inspiration for your next gathering.' },
  { name: 'Fresh Fish Selection', image: 'photo-1544943910-4c1dc44aab44', alt: 'Fresh fish with ingredients for cooking', description: 'Discover a new favourite for the grill, oven, or frying pan. Delicate flavours make this selection an easy starting point for a memorable meal.' },
  { name: 'Salmon Supper', image: 'photo-1510130387422-82bed34b37e9', alt: 'Salmon plated for a seafood supper', description: 'A little weeknight inspiration: flaky salmon, seasonal vegetables, and a bright squeeze of citrus. Simple ingredients, plenty of flavour.' },
  { name: 'Shrimp Platter', image: 'photo-1559737558-2f5a35f4523b', alt: 'A shrimp dish to share', description: 'Bring everyone to the table with a seafood platter made for sharing. Serve with a favourite dipping sauce and something crisp on the side.' },
  { name: 'Catch of the Day', image: 'photo-1544943910-4c1dc44aab44', alt: 'A selection of fish for a seafood meal', description: 'Keep your menu fresh with a little seasonal inspiration. This sample card is a preview of the seafood selection still to come.' },
];

function ProductCard({ product, index }) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = `product-description-${index}`;

  return (
    <article className={`product-card${expanded ? ' is-expanded' : ''}`}>
      <h2>{product.name}</h2>
      <button
        className="product-photo"
        type="button"
        aria-label={`Show description for ${product.name}`}
        aria-pressed={expanded}
        aria-describedby={descriptionId}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={event => { if (event.key === 'Escape') setExpanded(false); }}
      >
        <img src={`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=800&q=80`} alt={product.alt} loading="lazy" />
        <span className="product-description" id={descriptionId}>{product.description}</span>
      </button>
    </article>
  );
}

function Products() {
  return (
    <section className="page-shell products-page">
      <h1>Products</h1>
      <p className="products-intro">A little inspiration for your next meal. Explore our sample seafood selection.</p>
      <p className="products-hint">Hover, focus, or tap a photo to learn more. Products and photos are placeholders.</p>
      <div className="product-grid">
        {products.map((product, index) => <ProductCard key={product.name} product={product} index={index} />)}
      </div>
    </section>
  );
}

export default Products;

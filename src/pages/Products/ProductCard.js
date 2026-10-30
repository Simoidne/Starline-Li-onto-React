import { useId, useState } from 'react';

export default function ProductCard({ product }) {
  const descriptionId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const descriptionVisible = !dismissed && (hovered || focused || pinned);

  function handlePointerEnter(event) {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      setHovered(true);
      setDismissed(false);
    }
  }

  function handleFocus() {
    setFocused(true);
    setDismissed(false);
  }

  function handleBlur() {
    setFocused(false);
    setPinned(false);
  }

  function toggleDescription() {
    setPinned(!pinned);
    setDismissed(pinned);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setPinned(false);
      // Suppress hover and focus until the next deliberate interaction.
      setDismissed(true);
    }
  }

  return (
    <article className={`product-card${descriptionVisible ? ' is-expanded' : ''}`}>
      <h2>{product.name}</h2>
      {product.category && <p>{product.category}</p>}
      <p>
        {product.public_price_cad != null
          ? `${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(product.public_price_cad))} / ${product.unit}`
          : 'Contact us for pricing'}
      </p>
      <button
        className="product-photo"
        type="button"
        aria-label={`About ${product.name}`}
        aria-expanded={descriptionVisible}
        aria-controls={descriptionId}
        aria-describedby={descriptionVisible ? descriptionId : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={() => setHovered(false)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={toggleDescription}
        onKeyDown={handleKeyDown}
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt_text}
            loading="lazy"
          />
        ) : (
          <span className="product-no-photo">Photo coming soon</span>
        )}
        <span
          className="product-description"
          id={descriptionId}
          aria-hidden={!descriptionVisible}
        >
          {product.description}
        </span>
      </button>
    </article>
  );
}

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
        <img
          src={`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=800&q=80`}
          alt={product.alt}
          loading="lazy"
        />
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

import { useState } from 'react';

const slides = [
  {
    src: '/media/slide-images/IMG_6916.jpeg',
    alt: 'Starline Li seafood gallery photo 1',
  },
  { src: '/media/slide-images/L1001202.JPG', alt: 'Starline Li seafood gallery photo 2' },
];

export default function Slideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSlide = slides[currentIndex];

  function changeSlide(direction) {
    setCurrentIndex((index) => (index + direction + slides.length) % slides.length);
  }

  return (
    <section
      className="slideshow"
      aria-label="Seafood gallery"
      aria-roledescription="carousel"
    >
      <div className="slideshow-image" aria-live="polite" aria-atomic="true">
        <img src={currentSlide.src} alt={currentSlide.alt} />
        <span className="visually-hidden">
          Slide {currentIndex + 1} of {slides.length}
        </span>
      </div>
      <div className="slideshow-controls">
        <button
          type="button"
          className="slideshow-arrow"
          onClick={() => changeSlide(-1)}
          aria-label="Previous slide"
        >
          <span aria-hidden="true">&#10094;</span>
        </button>
        <button
          type="button"
          className="slideshow-arrow"
          onClick={() => changeSlide(1)}
          aria-label="Next slide"
        >
          <span aria-hidden="true">&#10095;</span>
        </button>
      </div>
      <div className="slide-dots" role="group" aria-label="Choose a slide">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Show slide ${index + 1}`}
            aria-current={currentIndex === index ? 'true' : undefined}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}

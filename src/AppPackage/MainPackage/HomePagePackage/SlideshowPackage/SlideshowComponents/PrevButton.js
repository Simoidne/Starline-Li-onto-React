// This is the PrevButton for the main page slideshow
function PrevButton({ onClick }) {
  return (
    <button type="button" className="prevButton" onClick={onClick} aria-label="Previous slide">
      <div className="pointerBackground">
        <p>&#10094;</p>
      </div>
    </button>
  );
}

export default PrevButton

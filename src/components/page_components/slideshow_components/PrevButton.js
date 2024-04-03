// This is the PrevButton for the main page slideshow
function PrevButton({ onClick }) {
  return (
    <div className="prevButton" onClick={onClick}>
      <div className="pointerBackground">
        <p>&#10094;</p>
      </div>
    </div>
  );
}

export default PrevButton

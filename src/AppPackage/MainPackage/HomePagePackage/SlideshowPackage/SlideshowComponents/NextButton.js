// This is the Next Button for the slideshow on the main page
function NextButton({ onClick }) {
  return (
    <button type="button" className="nextButton" onClick={onClick} aria-label="Next slide">
      <div className="pointerBackground">
        <p>&#10095;</p>
      </div>
    </button>
  );
}

export default NextButton

// This is the Next Button for the slideshow on the main page
function NextButton({ onClick }) {
  return (
    <div className="nextButton" onClick={onClick}>
      <div className="pointerBackground">
        <p>&#10095;</p>
      </div>
    </div>
  );
}

export default NextButton

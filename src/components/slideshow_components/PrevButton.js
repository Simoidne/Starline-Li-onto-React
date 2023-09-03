function PrevButton({ currentSlide, slideNum }) {
  if (currentSlide == 0) {
    currentSlide = slideNum - 1
  } else {
    currentSlide += 1
  }

  return (
    <div>
      
    </div>
  )
}

export default PrevButton

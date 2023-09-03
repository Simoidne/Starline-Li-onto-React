function NextButton({currentSlide, slideNum}) {
  if (currentSlide == slideNum - 1) {
    currentSlide = 0
  } else {
    currentSlide -= 1
  }
  
  return (
    <div>
      
    </div>
  )
}

export default NextButton

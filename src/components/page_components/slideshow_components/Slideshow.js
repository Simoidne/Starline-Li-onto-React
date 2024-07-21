import Slide from "./Slide"
import PrevButton from "./PrevButton"
import NextButton from "./NextButton"
import { useState } from "react"

// This is the Slideshow Displayed on the home page. 
const Slideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slideNum = 3

  const prevButtonClicked = () => {
    if (currentSlide === 0) {
      setCurrentSlide(slideNum - 1)
    } else {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const nextButtonClicked = () => {
    if (currentSlide === slideNum - 1) {
      setCurrentSlide(0)
    } else {
      setCurrentSlide(currentSlide + 1)
    }
  }

  return (
    <div className="slideshow">
      <div className="slideshowButtons">
        <PrevButton onClick={prevButtonClicked} />
        <NextButton onClick={nextButtonClicked} />
      </div>
      <Slide slide={currentSlide}/>
    </div>
  );
}

export default Slideshow

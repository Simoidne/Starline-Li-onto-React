import Slide from "./slideshow_components/Slide"
import PrevButton from "./slideshow_components/PrevButton"
import NextButton from "./slideshow_components/NextButton"
import { useState } from "react"

function Slideshow() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slideNum = 3

  const prevButtonClicked = () => {
    if (currentSlide === 0) {
      setCurrentSlide(slideNum - 1)
    } else {
      setCurrentSlide(currentSlide - 1)
    }
    console.log("Prev Button Clicked!")
  }

  const nextButtonClicked = () => {
    if (currentSlide === slideNum - 1) {
      setCurrentSlide(0)
    } else {
      setCurrentSlide(currentSlide + 1)
    }
    console.log("Next Button Clicked!")
  }

  return (
    <div className="slideshow">
      <PrevButton onClick={prevButtonClicked} />
      <Slide slide={currentSlide}/>
      <NextButton onClick={nextButtonClicked} />
    </div>
  )
}

export default Slideshow

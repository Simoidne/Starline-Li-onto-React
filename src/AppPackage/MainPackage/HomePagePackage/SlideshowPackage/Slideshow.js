import Slide from "./SlideshowComponents/Slide"
import PrevButton from "./SlideshowComponents/PrevButton"
import NextButton from "./SlideshowComponents/NextButton"
import { useState } from "react"

// This is the Slideshow Displayed on the home page. 
const Slideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slideNum = 2

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
    <section className="slideshow" aria-label="Seafood gallery" aria-roledescription="carousel">
      <div className="slideshowButtons">
        <PrevButton onClick={prevButtonClicked} />
        <NextButton onClick={nextButtonClicked} />
      </div>
      <Slide slide={currentSlide}/>
      <div className="slide-dots" aria-label="Choose a slide">
        {Array.from({ length: slideNum }, (_, index) => <button key={index} type="button" aria-label={`Show slide ${index + 1}`} aria-current={currentSlide === index ? 'true' : 'false'} onClick={() => setCurrentSlide(index)} />)}
      </div>
    </section>
  );
}

export default Slideshow

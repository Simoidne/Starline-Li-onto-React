import Slide from "./slideshow_components/Slide"
import PrevButton from "./slideshow_components/PrevButton"
import NextButton from "./slideshow_components/NextButton"

function Slideshow() {
  let currentSlide = 0
  const slideNum = 3

  return (
    <div className="slideshow">
      <PrevButton slide={currentSlide} slideNum={slideNum}/>
      <Slide slide={currentSlide}/>
      <NextButton slide={currentSlide} slideNum={slideNum}/>
    </div>
  )
}

export default Slideshow

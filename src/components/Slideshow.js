import Slide from "./slideshow_components/Slide"
import PrevButton from "./slideshow_components/PrevButton"
import NextButton from "./slideshow_components/NextButton"

function Slideshow() {
  return (
    <div className="slideshow">
      <PrevButton />
      <Slide />
      <NextButton />
    </div>
  )
}

export default Slideshow

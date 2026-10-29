function Slide({ slide }) {
  const images = [
    "/media/slide-images/IMG_6916.jpeg",
    "/media/slide-images/L1001202.JPG"
  ];
  
  let currentImage = images[slide];

  return (
    <div className="imgContainer" aria-live="polite" aria-atomic="true">
      <img src={currentImage} alt={`Starline Li seafood gallery, ${slide + 1} of ${images.length}`} />
    </div>
  );
}

export default Slide

function Slide({ slide }) {
  const images = [
    "media/slide-images/IMG_6916.jpeg",
    "media/slide-images/L1001202.JPG",
    "media/slide-images/IMG_1563.HEIC"
  ];
  
  let currentImage = images[slide];

  return (
    <div className="imgContainer">
      <img src={currentImage} alt="" />
    </div>
  );
}

export default Slide

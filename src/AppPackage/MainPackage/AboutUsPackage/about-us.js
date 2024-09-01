// import Banner from './about-us-components/AboutUsBanner'
import AboutUsContent from './AboutUsContentPackage/AboutUsContent';
import AboutUsNav from './AboutUsNav'
import './about-us.css'

function AboutUs() {
    return (
        // <Banner />
        // Introduction to retail
        // History
        // Commitment to quality
        // our store location
        // TODO add about us content
        // <h1>Coming Soon</h1>
        <div className='aboutUsPage'>
            <AboutUsNav />
            <AboutUsContent />
            <div className='theBigTestDiv'></div>
        </div>
    );
}

export default AboutUs
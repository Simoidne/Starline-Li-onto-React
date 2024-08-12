import { Routes, Route } from 'react-router-dom';
import Home from './HomePagePackage/home.js';
import AboutUs from './AboutUsPackage/about-us.js';
import ContactUs from './ContactUsPackage/contact-us.js';
import Products from './ProductPagePackage/products.js';

function Main() {
        return (
            <Routes>
                <Route path='/' element={<Home/>}></Route>
                <Route path='/About-us' element={<AboutUs/>}></Route>
                <Route path='/Contact-us' element={<ContactUs/>}></Route>
                <Route path='/Products' element={<Products/>}></Route>
            </Routes>
        )
}

export default Main
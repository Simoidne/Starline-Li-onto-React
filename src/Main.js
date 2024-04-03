import { Routes, Route } from 'react-router-dom';
import Home from './components/page_components/home.js';
import AboutUs from './components/page_components/about-us.js';
import ContactUs from './components/page_components/contact-us.js';
import Products from './components/page_components/products.js';

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
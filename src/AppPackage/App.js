import Header from "./HeaderPackage/Header";
import Main from './MainPackage/Main'
import './HeaderPackage/header.css';


function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main id="main-content" tabIndex="-1"><Main /></main>
    </div>
  );
}

export default App;

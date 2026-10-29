import AboutSection from './AboutSection';
import { sections } from './sections';
import './AboutUs.css';

export default function AboutUs() {
  return (
    <div className="about-page">
      <h1 className="visually-hidden">About Us</h1>
      <nav className="about-nav" aria-label="About us sections">
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="about-content">
        {sections.map((section, index) => (
          <AboutSection
            key={section.id}
            section={section}
            imageOnRight={index % 2 === 1}
          />
        ))}
      </div>
    </div>
  );
}

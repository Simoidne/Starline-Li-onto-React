export default function AboutSection({ section, imageOnRight }) {
  return (
    <section
      id={section.id}
      className={`about-section${imageOnRight ? ' about-section-reversed' : ''}`}
    >
      <img src={section.image} alt={section.alt} loading="lazy" />
      <div className="about-section-copy">
        <h2>{section.title}</h2>
        <h3>{section.subtitle}</h3>
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

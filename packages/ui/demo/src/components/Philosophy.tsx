import './Philosophy.css';

export function Philosophy() {
  return (
    <div className="philosophy">
      <h3>Color Philosophy</h3>
      <p>
        <strong>Light mode:</strong> Minimal, papier aesthetic with warm off-white (#FBF1C7)
        background. Pure black (#1C1C1C) text maximizes readability. Pastel accents provide subtle
        hierarchy.
      </p>
      <p className="philosophy__paragraph">
        <strong>Dark mode:</strong> Soft white-on-charcoal for comfortable low-light reading. The
        same pastel palette persists, adjusted for sufficient contrast.
      </p>
    </div>
  );
}

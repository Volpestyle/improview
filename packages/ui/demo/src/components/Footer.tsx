import './Footer.css';

export function Footer() {
  return (
    <footer className="demo-footer">
      <p>Built with 💙 using Geist font and pastel colors</p>
      <div className="demo-footer__links">
        <a href="https://github.com/improview/ui" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span>•</span>
        <a href="../docs/ui_design_guide.md" target="_blank" rel="noopener noreferrer">
          Design Guide
        </a>
        <span>•</span>
        <a href="../docs/color-palette-guide.md" target="_blank" rel="noopener noreferrer">
          Color Guide
        </a>
      </div>
    </footer>
  );
}

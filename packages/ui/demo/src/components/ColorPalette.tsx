import { Card } from '../../../src/components/Card';
import { useState } from 'react';
import './ColorPalette.css';

interface ColorCardProps {
  name: string;
  hex: string;
  usage: string;
}

function ColorCard({ name, hex, usage }: ColorCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      interactive
      onClick={copyToClipboard}
      media={
        <div className="color-card__swatch" style={{ background: hex }}>
          {copied && <span className="color-card__copied">Copied!</span>}
        </div>
      }
      title={name}
      subtitle={hex}
    >
      {usage}
    </Card>
  );
}

export function ColorPalette() {
  const colors = {
    backgrounds: [
      { name: 'bg.default', hex: '#FBF1C7', usage: 'Main app background' },
      { name: 'bg.panel', hex: '#F2E5BC', usage: 'Cards, sidebars' },
      { name: 'bg.sunken', hex: '#EBDBB2', usage: 'Input backgrounds, wells' },
      { name: 'bg.elevated', hex: '#FFFFFF', usage: 'Modals, dropdowns' },
    ],
    foregrounds: [
      { name: 'fg.default', hex: '#1C1C1C', usage: 'Body text, headings' },
      { name: 'fg.muted', hex: '#504945', usage: 'Secondary text' },
      { name: 'fg.subtle', hex: '#7C6F64', usage: 'Tertiary text' },
    ],
    accents: [
      { name: 'accent.primary', hex: '#83A598', usage: 'Links, focus (both themes!)' },
      { name: 'accent.emphasis', hex: '#689D6A', usage: 'CTAs, emphasis' },
      { name: 'accent.soft', hex: '#B8D4CB', usage: 'Muted accent' },
    ],
    semantic: [
      { name: 'info.600', hex: '#76A9D8', usage: 'Informational messages' },
      { name: 'success.600', hex: '#689D6A', usage: 'Success states' },
      { name: 'warning.600', hex: '#D79921', usage: 'Warnings, alerts' },
      { name: 'danger.600', hex: '#CC241D', usage: 'Errors, destructive' },
    ],
  };

  return (
    <>
      <section className="demo-section">
        <h2 className="demo-section__title">Backgrounds</h2>
        <div className="color-grid">
          {colors.backgrounds.map((color) => (
            <ColorCard key={color.name} {...color} />
          ))}
        </div>
      </section>

      <section className="demo-section">
        <h2 className="demo-section__title">Foreground / Text</h2>
        <div className="color-grid">
          {colors.foregrounds.map((color) => (
            <ColorCard key={color.name} {...color} />
          ))}
        </div>
      </section>

      <section className="demo-section">
        <h2 className="demo-section__title">Pastel Accents (Shared)</h2>
        <p className="demo-section__description">
          These accent colors are consistent across both light and dark themes for brand identity.
        </p>
        <div className="color-grid">
          {colors.accents.map((color) => (
            <ColorCard key={color.name} {...color} />
          ))}
        </div>
      </section>

      <section className="demo-section">
        <h2 className="demo-section__title">Semantic Colors</h2>
        <div className="color-grid">
          {colors.semantic.map((color) => (
            <ColorCard key={color.name} {...color} />
          ))}
        </div>
      </section>
    </>
  );
}

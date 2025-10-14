import { Card, Button } from '@improview/ui';
import './CardShowcase.css';

export function CardShowcase() {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Card Component</h2>
      <p className="demo-section__description">
        Flexible container for content with optional media, header, body, and footer.
      </p>

      <div className="card-showcase">
        {/* Basic Card */}
        <div className="card-showcase__group">
          <h3 className="card-showcase__subtitle">Basic Cards</h3>
          <div className="card-showcase__grid">
            <Card title="Default Variant" subtitle="Standard appearance">
              This is a basic card with title, subtitle, and body content.
            </Card>

            <Card variant="elevated" title="Elevated Variant" subtitle="With shadow">
              This card appears elevated with a medium shadow effect.
            </Card>

            <Card variant="outlined" title="Outlined Variant" subtitle="Prominent border">
              This card has a 2px border and transparent background.
            </Card>
          </div>
        </div>

        {/* Interactive Cards */}
        <div className="card-showcase__group">
          <h3 className="card-showcase__subtitle">Interactive Cards</h3>
          <div className="card-showcase__grid">
            <Card
              interactive
              onClick={() => alert('Card clicked!')}
              title="Clickable Card"
              subtitle="Try clicking me"
            >
              Interactive cards include scale animations on hover and tap.
            </Card>

            <Card
              interactive
              variant="elevated"
              onClick={() => alert('Elevated and clickable!')}
              title="Interactive + Elevated"
            >
              Combines elevation with interactive behavior.
            </Card>
          </div>
        </div>

        {/* Cards with Media */}
        <div className="card-showcase__group">
          <h3 className="card-showcase__subtitle">Cards with Media</h3>
          <div className="card-showcase__grid">
            <Card
              media={
                <div
                  style={{
                    height: '160px',
                    background:
                      'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-emphasis) 100%)',
                  }}
                ></div>
              }
              title="Gradient Media"
              subtitle="With color gradient"
            >
              Cards can include any media element at the top.
            </Card>

            <Card
              media={
                <div
                  style={{
                    height: '160px',
                    background: 'var(--color-accent-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                  }}
                >
                  🎨
                </div>
              }
              title="Emoji Media"
              subtitle="Custom content"
            >
              Use any React component as media content.
            </Card>
          </div>
        </div>

        {/* Cards with Footer */}
        <div className="card-showcase__group">
          <h3 className="card-showcase__subtitle">Cards with Footer</h3>
          <div className="card-showcase__grid">
            <Card
              title="Article Title"
              subtitle="Published on Oct 14, 2025"
              footer={
                <div className="card-showcase__footer-actions">
                  <Button size="sm">Read More</Button>
                  <Button size="sm" variant="ghost">
                    Share
                  </Button>
                </div>
              }
            >
              This card includes action buttons in the footer section for better UX patterns.
            </Card>

            <Card
              variant="elevated"
              title="Product Card"
              subtitle="$49.99"
              media={
                <div
                  style={{
                    height: '140px',
                    background: 'var(--color-info-600)',
                  }}
                ></div>
              }
              footer={
                <Button size="sm" className="card-showcase__footer-button">
                  Add to Cart
                </Button>
              }
            >
              A product card with media, pricing, and a primary action.
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

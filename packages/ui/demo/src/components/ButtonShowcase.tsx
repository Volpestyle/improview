import { Button } from '@improview/ui';
import './ButtonShowcase.css';

// Simple icons for demonstration
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 3L11 8L6 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 3V13M3 8H13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 4H14M5 4V2H11V4M6 7V11M10 7V11M3 4L4 14H12L13 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function ButtonShowcase() {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Button Component</h2>
      <p className="demo-section__description">
        Minimal API built around variant and size tokens with optional <code>asChild</code> support
        for polymorphic usage.
      </p>

      <div className="button-showcase">
        <h3 className="button-showcase__heading">Variants</h3>
        <div className="button-showcase__grid">
          <div>
            <Button variant="default">Default</Button>
            <p className="button-showcase__label">Default</p>
          </div>
          <div>
            <Button variant="secondary">Secondary</Button>
            <p className="button-showcase__label">Secondary</p>
          </div>
          <div>
            <Button variant="outline">Outline</Button>
            <p className="button-showcase__label">Outline</p>
          </div>
          <div>
            <Button variant="ghost">Ghost</Button>
            <p className="button-showcase__label">Ghost</p>
          </div>
          <div>
            <Button variant="destructive">Destructive</Button>
            <p className="button-showcase__label">Destructive</p>
          </div>
          <div>
            <Button variant="link">Link</Button>
            <p className="button-showcase__label">Link</p>
          </div>
        </div>
      </div>

      <div className="button-showcase">
        <h3 className="button-showcase__heading">Sizes</h3>
        <div className="button-showcase__row">
          <Button variant="default" size="sm">
            Small
          </Button>
          <Button variant="default">
            Medium
          </Button>
          <Button variant="default" size="lg">
            Large
          </Button>
          <Button variant="outline" size="icon" aria-label="Add">
            <PlusIcon />
          </Button>
        </div>
      </div>

      <div className="button-showcase">
        <h3 className="button-showcase__heading">With Icons</h3>
        <div className="button-showcase__row">
          <Button variant="default">
            <span className="button-showcase__icon">
              <PlusIcon />
            </span>
            Add Item
          </Button>
          <Button variant="secondary">
            Continue
            <span className="button-showcase__icon">
              <ChevronRightIcon />
            </span>
          </Button>
          <Button variant="destructive">
            <span className="button-showcase__icon">
              <TrashIcon />
            </span>
            Delete
          </Button>
        </div>
      </div>

      <div className="button-showcase">
        <h3 className="button-showcase__heading">States</h3>
        <div className="button-showcase__row">
          <Button variant="default" disabled>
            Disabled
          </Button>
          <Button variant="outline" className="button-showcase__loading">
            <span className="button-showcase__spinner" aria-hidden="true" />
            Loading
          </Button>
        </div>
      </div>

      <div className="button-showcase">
        <h3 className="button-showcase__heading">As Child</h3>
        <Button asChild variant="link">
          <a href="#buttons" className="button-showcase__link">
            Inline link styled as button
          </a>
        </Button>
        <div className="button-showcase__note">
          Buttons can wrap anchors or other elements without breaking semantics.
        </div>
      </div>
    </section>
  );
}

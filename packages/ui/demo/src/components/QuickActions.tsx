import { Button } from '@improview/ui';
import './QuickActions.css';

export function QuickActions() {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Quick Actions</h2>
      <div className="quick-actions">
        <Button variant="default" size="lg" className="quick-actions__primary">
          Generate Problem Pack
        </Button>
        <div className="quick-actions__row">
          <Button variant="secondary">
            View History
          </Button>
          <Button variant="ghost">
            Settings
          </Button>
        </div>
      </div>
    </section>
  );
}

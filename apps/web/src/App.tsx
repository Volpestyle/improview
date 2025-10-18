import { Outlet } from '@tanstack/react-router';
import { SkipLink } from '@improview/ui';

/**
 * Root App component (layout wrapper)
 */
export function App() {
  return (
    <>
      <SkipLink />
      <div id="main-content" className="size-full">
        <Outlet />
      </div>
    </>
  );
}

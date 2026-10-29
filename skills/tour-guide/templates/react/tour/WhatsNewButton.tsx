import type { ButtonHTMLAttributes } from 'react';
import { useTour } from './context';

/**
 * Replays the newest release's what's-new steps. Shows a sparkle icon by default; pass children for a text label.
 * Renders nothing when the tour has no what's-new steps yet. Place it next to <ShowMeAroundButton />.
 */
export function WhatsNewButton({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { startTour, whatsNewVersion } = useTour();
  if (!whatsNewVersion) return null;
  const label = `What's new in ${whatsNewVersion}`;
  return (
    <button type="button" aria-label={label} title={label} {...rest} onClick={() => startTour('whatsNew')}>
      {children ?? <SparkleIcon />}
    </button>
  );
}

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}

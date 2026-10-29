import type { ButtonHTMLAttributes } from 'react';
import { useTour } from './context';

/** Replays the basic tour. Style it like the app's other buttons by passing className. */
export function ShowMeAroundButton({ children = 'Show me around', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { startTour } = useTour();
  return (
    <button type="button" {...rest} onClick={() => startTour('basic')}>
      {children}
    </button>
  );
}

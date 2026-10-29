import { createContext, useContext } from 'react';
import type { TourKind } from './types';

export interface TourContextValue {
  startTour: (kind?: TourKind) => void;
  isActive: boolean;
  /** Newest version (up to the running one) that has what's-new steps, or null if there are none. */
  whatsNewVersion: string | null;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const value = useContext(TourContext);
  if (!value) throw new Error('useTour must be used inside <TourProvider>');
  return value;
}

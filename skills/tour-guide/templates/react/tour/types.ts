export type Placement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  /** Unique, stable id for the step, e.g. "export-data". */
  id: string;
  /** Value of the element's data-tour attribute. Omit for a centered step such as a welcome. */
  target?: string;
  title: string;
  body: string;
  /** App version that introduced this step. No `since` = part of the basic tour. */
  since?: string;
  /**
   * Ids of older what's-new steps this one supersedes (the feature changed again).
   * When both would show, only this one does, so users never see an outdated card.
   */
  replaces?: string[];
  /**
   * Route to open before showing the step. Handled by TourProvider's onBeforeStep.
   * Steps without one use the route of the closest earlier step that has one.
   */
  route?: string;
  placement?: Placement;
}

export interface TourFile {
  $schema?: string;
  steps: TourStep[];
}

/** 'system' follows the OS light/dark setting. Use 'dark' or 'light' for apps with a fixed look. */
export type TourTheme = 'light' | 'dark' | 'system';

/** Optional colors so the tour matches the app. Any CSS color works. */
export interface TourColors {
  accent?: string;
  accentText?: string;
  cardBg?: string;
  cardText?: string;
  muted?: string;
  backdrop?: string;
}

/** 'basic' = the foundational tour, 'whatsNew' = steps added since the user's last version. */
export type TourKind = 'basic' | 'whatsNew';

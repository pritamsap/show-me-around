import type { TourKind, TourStep } from './types';

/** Default for how many what's-new steps a user sees at once after skipping several releases. */
export const DEFAULT_MAX_WHATS_NEW = 6;

/** Compares "1.2.3" style versions: negative if a < b, 0 if equal, positive if a > b. Ignores "v" and "-beta" parts. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export function basicSteps(steps: TourStep[]): TourStep[] {
  return steps.filter((s) => !s.since);
}

/**
 * Steps introduced after `lastSeen`, up to and including `current`.
 * If one of them `replaces` another (the feature changed again), only the newer one is shown.
 * If there are more than `max` (the user skipped many releases), only the newest `max` are shown.
 */
export function whatsNewSteps(
  steps: TourStep[],
  lastSeen: string,
  current: string,
  max = DEFAULT_MAX_WHATS_NEW,
): TourStep[] {
  const inRange = steps.filter(
    (s) => s.since && compareVersions(s.since, lastSeen) > 0 && compareVersions(s.since, current) <= 0,
  );
  return keepNewest(dropReplaced(inRange), max);
}

/** Steps for the newest version that has any, so a "What's new" menu item can replay them. */
export function latestWhatsNewSteps(steps: TourStep[], current: string, max = DEFAULT_MAX_WHATS_NEW): TourStep[] {
  const versions = steps
    .map((s) => s.since)
    .filter((v): v is string => !!v && compareVersions(v, current) <= 0)
    .sort(compareVersions);
  const latest = versions[versions.length - 1];
  if (!latest) return [];
  return keepNewest(dropReplaced(steps.filter((s) => s.since && compareVersions(s.since, latest) === 0)), max);
}

/**
 * What to show on app start:
 * - never seen the tour (fresh install)  -> basic tour
 * - updated since last time              -> what's new, if there are steps for it
 * - otherwise                            -> nothing
 */
export function decideAutoStart(
  steps: TourStep[],
  lastSeen: string | null,
  current: string,
  max = DEFAULT_MAX_WHATS_NEW,
): { kind: TourKind; steps: TourStep[] } | null {
  if (lastSeen === null) {
    const basic = basicSteps(steps);
    return basic.length > 0 ? { kind: 'basic', steps: basic } : null;
  }
  if (compareVersions(lastSeen, current) < 0) {
    const fresh = whatsNewSteps(steps, lastSeen, current, max);
    return fresh.length > 0 ? { kind: 'whatsNew', steps: fresh } : null;
  }
  return null;
}

function dropReplaced(steps: TourStep[]): TourStep[] {
  const replaced = new Set(steps.flatMap((s) => s.replaces ?? []));
  return steps.filter((s) => !replaced.has(s.id));
}

/** Keeps the `max` steps from the newest versions, in their original order. */
function keepNewest(steps: TourStep[], max: number): TourStep[] {
  if (steps.length <= max) return steps;
  const newest = new Set([...steps].sort((a, b) => compareVersions(b.since ?? '0', a.since ?? '0')).slice(0, max));
  return steps.filter((s) => newest.has(s));
}

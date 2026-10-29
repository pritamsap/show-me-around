import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Placement, TourColors, TourKind, TourStep, TourTheme } from './types';

const PADDING = 8; // space between the element and the edge of the spotlight
const RADIUS = 8; // corner rounding of the spotlight hole
const GAP = 12; // space between the spotlight and the card
const MARGIN = 16; // minimum distance from the window edges
const GLIDE_MS = 450; // how long the spotlight takes to move between steps (keep in sync with --tour-duration)

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface TourOverlayProps {
  step: TourStep;
  element: Element | null;
  index: number;
  total: number;
  kind: TourKind;
  theme: TourTheme;
  colors?: TourColors;
  voiceSrc?: string;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

export function TourOverlay(props: TourOverlayProps) {
  const { step, element, index, total, kind, theme, colors, voiceSrc, muted, onMutedChange, onNext, onBack, onClose } =
    props;
  const narration = useNarration(voiceSrc, muted, onMutedChange);
  // `hole` is where the spotlight is going (used to place the card); `spot` is where it is drawn right now.
  const [hole, setHole] = useState<Rect | null>(null);
  const [spot, setSpot] = useState<Rect>(centerPoint);
  const spotRef = useRef(spot);
  // Start the card in the middle of the window so its first move is a short glide, not a jump from a corner.
  const [cardPos, setCardPos] = useState<Point>(() => ({
    x: (window.innerWidth - 320) / 2,
    y: (window.innerHeight - 160) / 2,
  }));
  const cardRef = useRef<HTMLDivElement>(null);

  // Glide the spotlight to the new target, then keep it on the element when the window resizes or scrolls.
  // We animate it ourselves, frame by frame, because Chromium draws CSS transitions of clip-path: path()
  // incorrectly (the blur shrinks to a box in the corner until the transition ends).
  useLayoutEffect(() => {
    const draw = (r: Rect) => {
      spotRef.current = r;
      setSpot(r);
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 'nearest' only scrolls when the element is off screen, so visible targets don't make the page jump.
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });

    let target = element ? measure(element) : centerPoint();
    setHole(element ? target : null);

    const from = spotRef.current;
    const start = performance.now();
    let gliding = !reduceMotion;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / GLIDE_MS, 1);
      draw(mixRects(from, target, easeOut(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else gliding = false;
    };
    if (gliding) frame = requestAnimationFrame(tick);
    else draw(target);

    if (!element) return () => cancelAnimationFrame(frame);

    // While gliding, a scroll just moves the destination; afterwards the spotlight follows the element directly.
    const follow = () => {
      target = measure(element);
      setHole(target);
      if (!gliding) draw(target);
    };
    const observer = new ResizeObserver(follow);
    observer.observe(element);
    window.addEventListener('resize', follow);
    window.addEventListener('scroll', follow, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', follow);
      window.removeEventListener('scroll', follow, true);
    };
  }, [element]);

  // Place the card next to the spotlight once we know both sizes.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (card) setCardPos(placeCard(hole, card.offsetWidth, card.offsetHeight, step.placement ?? 'auto'));
  }, [hole, step]);

  useEffect(() => {
    cardRef.current?.focus();
  }, [step]);

  // Give focus back to whatever had it before the tour opened.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onBack, onClose]);

  const isLast = index === total - 1;

  return (
    <div className="tour-root" data-theme={theme} style={colorVariables(colors)}>
      <div className="tour-blur" style={{ clipPath: spotlightPath(spot) }} />
      {/* Transparent ring over the target: draws the outline and blocks clicks while the tour is open. */}
      <div
        className="tour-ring"
        style={{
          transform: `translate(${spot.left}px, ${spot.top}px)`,
          width: spot.width,
          height: spot.height,
          opacity: hole ? 1 : 0,
        }}
      />
      <div
        ref={cardRef}
        className="tour-card"
        style={{ transform: `translate(${cardPos.x}px, ${cardPos.y}px)` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        {/* The key makes React swap this block on every step, which replays the fade-in animation. */}
        <div key={step.id} className="tour-card-content">
          {kind === 'whatsNew' && step.since && <span className="tour-badge">New in {step.since}</span>}
          <h2 id="tour-title" className="tour-title">
            {step.title}
          </h2>
          <p id="tour-body" className="tour-body">
            {step.body}
          </p>
        </div>
        <div className="tour-footer">
          <span className="tour-count">
            {voiceSrc && (
              <button
                type="button"
                className="tour-btn tour-btn-icon"
                onClick={narration.toggle}
                aria-label={narration.playing ? 'Mute narration' : 'Play narration'}
                title={narration.playing ? 'Mute narration' : 'Play narration'}
              >
                {narration.playing ? <SpeakerIcon /> : <SpeakerOffIcon />}
              </button>
            )}
            {index + 1} of {total}
          </span>
          <div className="tour-actions">
            {!isLast && (
              <button type="button" className="tour-btn tour-btn-ghost" onClick={onClose}>
                Skip
              </button>
            )}
            {index > 0 && (
              <button type="button" className="tour-btn" onClick={onBack}>
                Back
              </button>
            )}
            <button type="button" className="tour-btn tour-btn-primary" onClick={onNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Plays the current step's narration and stops it when the step changes or the tour closes.
 * Browsers block sound until the user has clicked something, so the first step may start silent:
 * the speaker button then shows as off, and one click starts it.
 */
function useNarration(src: string | undefined, muted: boolean, onMutedChange: (muted: boolean) => void) {
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src || muted) return;
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.play().then(
      () => setBlocked(false),
      () => setBlocked(true),
    );
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src, muted]);

  const toggle = () => {
    if (blocked && !muted) {
      audioRef.current?.play().then(() => setBlocked(false), () => {});
      return;
    }
    setBlocked(false);
    onMutedChange(!muted);
  };

  return { playing: !muted && !blocked, toggle };
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  );
}

/** A zero-size spot in the middle of the window: used for centered steps, so the next hole grows out of it. */
function centerPoint(): Rect {
  return { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };
}

/** The element's box plus padding, in window coordinates. */
function measure(element: Element): Rect {
  const r = element.getBoundingClientRect();
  return { top: r.top - PADDING, left: r.left - PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 };
}

/** The rect `t` of the way from `a` to `b` (t = 0 is a, t = 1 is b). */
function mixRects(a: Rect, b: Rect, t: number): Rect {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return { top: mix(a.top, b.top), left: mix(a.left, b.left), width: mix(a.width, b.width), height: mix(a.height, b.height) };
}

/** Starts fast and settles gently, close to the CSS curve the card uses. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * One blurred layer covering the window, with a rounded hole cut out by clip-path.
 * The path draws the window outline, then the hole; "evenodd" makes the inner shape a hole.
 */
function spotlightPath(spot: Rect): string {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = Math.min(RADIUS, spot.width / 2, spot.height / 2);
  const left = spot.left;
  const top = spot.top;
  const right = spot.left + spot.width;
  const bottom = spot.top + spot.height;
  return (
    `path(evenodd, "M0 0 H${vw} V${vh} H0 Z ` +
    `M${left + r} ${top} H${right - r} A${r} ${r} 0 0 1 ${right} ${top + r} ` +
    `V${bottom - r} A${r} ${r} 0 0 1 ${right - r} ${bottom} ` +
    `H${left + r} A${r} ${r} 0 0 1 ${left} ${bottom - r} ` +
    `V${top + r} A${r} ${r} 0 0 1 ${left + r} ${top} Z")`
  );
}

/**
 * Turns { cardBg: '#111' } into { '--tour-card-bg': '#111' }.
 * Inline styles beat any stylesheet rule, so app colors always win over tour.css defaults.
 */
function colorVariables(colors: TourColors | undefined): CSSProperties | undefined {
  if (!colors) return undefined;
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    if (value) vars[`--tour-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value;
  }
  return vars as CSSProperties;
}

function placeCard(hole: Rect | null, w: number, h: number, placement: Placement): Point {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!hole) return { x: (vw - w) / 2, y: (vh - h) / 2 };

  const fits = {
    bottom: vh - (hole.top + hole.height) >= h + GAP + MARGIN,
    top: hole.top >= h + GAP + MARGIN,
    right: vw - (hole.left + hole.width) >= w + GAP + MARGIN,
    left: hole.left >= w + GAP + MARGIN,
  };
  const order = ['bottom', 'top', 'right', 'left'] as const;
  const side = placement !== 'auto' && fits[placement] ? placement : order.find((s) => fits[s]);

  const centerX = hole.left + hole.width / 2 - w / 2;
  const centerY = hole.top + hole.height / 2 - h / 2;
  let top: number;
  let left: number;
  switch (side) {
    case 'bottom':
      top = hole.top + hole.height + GAP;
      left = centerX;
      break;
    case 'top':
      top = hole.top - GAP - h;
      left = centerX;
      break;
    case 'right':
      top = centerY;
      left = hole.left + hole.width + GAP;
      break;
    case 'left':
      top = centerY;
      left = hole.left - GAP - w;
      break;
    default:
      // Nothing fits (the element fills the window): pin the card to the bottom center.
      top = vh - h - MARGIN;
      left = (vw - w) / 2;
  }
  return { x: clamp(left, MARGIN, vw - w - MARGIN), y: clamp(top, MARGIN, vh - h - MARGIN) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

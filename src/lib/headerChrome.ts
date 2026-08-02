// Two small pieces of header behaviour that need the DOM rather than CSS.
//
// Both exist because the phone header is multi-row and its height is therefore
// not a constant. See docs/app-shell-overview.md, "Responsive shell".
import { useEffect, useRef, useState } from 'react';

/** The view scrollers. Scrolling a modal body must not move the header. */
const VIEW_SCROLLERS = '.dash-scroll, .record-main, .player-main';

/** Ignore scroll jitter; a real directional gesture clears this easily. */
const DEADZONE = 6;

/** Stay put near the top, so the nav does not flicker away on a short nudge. */
const ARM_AT = 96;

/**
 * How long to keep reading scroll without acting on it after a tuck changes.
 *
 * THE TUCK MOVES THE THING IT IS MEASURED FROM. `.app-shell` is a fixed-height
 * flex column, so collapsing the 44px nav row makes the view's scroll container
 * 44px TALLER — and a taller container clamps `scrollTop` down when you are
 * near the bottom of a short page. That drop reads as "scrolled up", which
 * untucks, which shrinks the container, which pushes `scrollTop` back up, which
 * tucks. Measured oscillating on the dashboard.
 *
 * So after each change, spend one transition's worth of events updating the
 * baseline and deciding nothing. The reflow's delta lands inside that window
 * and is absorbed; a real gesture continues past it. Slightly longer than the
 * 0.22s CSS transition, because the container resizes as it animates.
 */
const SETTLE_MS = 280;

/**
 * Tuck the nav row away while the reader scrolls down, bring it back the
 * moment they scroll up.
 *
 * `scroll` does not bubble, but it does capture, so one listener on the
 * document sees every container. The app scrolls inside per-view elements
 * (`.app-shell` is `height: 100vh; overflow: hidden`), so listening on `window`
 * would see nothing at all.
 *
 * Returns whether the nav should currently be tucked. The CSS decides whether
 * that means anything — above 640px the header is one row and there is nothing
 * to reclaim, so the class is inert there.
 */
export function useNavTuck(enabled: boolean, resetKey: string): boolean {
  const [tucked, setTucked] = useState(false);
  // Mirrors `tucked` for the listener, which must not be re-bound on every
  // change. A ref rather than a closure variable because the reset below has to
  // reach it too — otherwise a route change untucks the nav visually while the
  // listener still believes it is tucked, and the next scroll down does nothing.
  const want = useRef(false);

  // A new view starts at the top with the nav in view: leaving it tucked would
  // strand the reader on a page whose destinations are hidden.
  useEffect(() => { want.current = false; setTucked(false); }, [resetKey]);

  useEffect(() => {
    if (!enabled) { want.current = false; setTucked(false); return; }
    const lastTop = new WeakMap<Element, number>();
    let settleUntil = 0;

    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.matches(VIEW_SCROLLERS)) return;
      const top = el.scrollTop;
      const delta = top - (lastTop.get(el) ?? 0);
      lastTop.set(el, top);

      // Baseline updated above, decision skipped: see SETTLE_MS.
      if (performance.now() < settleUntil) return;
      if (Math.abs(delta) < DEADZONE) return;

      // Scrolling down near the top is not a request to tuck, and it is not a
      // request to untuck either: it is no request at all.
      let next: boolean;
      if (delta > 0) { if (top <= ARM_AT) return; next = true; } else next = false;

      if (next === want.current) return;
      want.current = next;
      settleUntil = performance.now() + SETTLE_MS;
      setTucked(next);
    };

    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, [enabled]);

  return tucked;
}

/**
 * Publish the header's live height as `--header-live-h` on the document root.
 *
 * The bell popover is `position: fixed` and has to sit under the header, which
 * is one row on a desktop, two on a phone, and one again while the nav is
 * tucked. That was a hardcoded `top` literal, correct for exactly one of those.
 * Measuring it means the popover follows the header instead of being re-guessed
 * every time a row is added or removed.
 *
 * Takes the ELEMENT, not a flag. The first version took `signedIn` and looked
 * the header up with `querySelector`, which silently did nothing: `signedIn`
 * flips while the route is still `/boot`, so the effect ran one commit before
 * the shell existed, found nothing, and never re-ran. Same trap as
 * `mount-reads-need-hydration-gates` — a DOM read gated on a signal that is not
 * the one governing the DOM. A ref cannot be early.
 */
export function useHeaderHeightVar(header: HTMLElement | null): void {
  useEffect(() => {
    if (!header) return;
    const publish = () => {
      document.documentElement.style.setProperty(
        '--header-live-h', `${Math.round(header.getBoundingClientRect().height)}px`,
      );
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(header);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--header-live-h');
    };
  }, [header]);
}

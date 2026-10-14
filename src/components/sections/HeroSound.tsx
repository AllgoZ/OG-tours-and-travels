"use client";

import { useEffect } from "react";

// Low volumes; the honk sits a bit under the engine roar.
const ENGINE_SRC = "/sounds/engine-roar.mp3";
const HONK_SRC = "/sounds/car-honk.mp3";
const ENGINE_VOLUME = 0.3;
const HONK_VOLUME = 0.15;
const HONK_DELAY_MS = 700; // honk arrives as the vehicle settles

/**
 * Plays the engine roar (and a honk shortly after) once, synced with the hero vehicle's
 * slide-in on load. Kept quiet, plays a single time, and never for visitors who prefer
 * reduced motion.
 *
 * Browsers block audio before any user interaction, so we try on load and, if that is
 * blocked, play on the first user gesture instead.
 */
export function HeroSound() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const engine = new Audio(ENGINE_SRC);
    engine.preload = "auto";
    engine.volume = ENGINE_VOLUME;

    const honk = new Audio(HONK_SRC);
    honk.preload = "auto";
    honk.volume = HONK_VOLUME;

    let played = false;
    let honkTimer: ReturnType<typeof setTimeout> | undefined;
    const gestures: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "wheel"];
    const cleanupGestures = () => gestures.forEach((g) => window.removeEventListener(g, start));

    function start() {
      if (played) return;
      const p = engine.play();
      if (p === undefined) {
        // Older browsers: no promise — assume it started.
        played = true;
        cleanupGestures();
        honkTimer = setTimeout(() => honk.play().catch(() => {}), HONK_DELAY_MS);
        return;
      }
      p.then(() => {
        if (played) return; // a concurrent attempt already won
        played = true;
        cleanupGestures();
        honkTimer = setTimeout(() => honk.play().catch(() => {}), HONK_DELAY_MS);
      }).catch(() => {
        // Blocked (no user gesture yet) — the gesture listeners below will retry.
      });
    }

    // Try immediately (synced with the slide-in); fall back to the first user gesture.
    start();
    gestures.forEach((g) => window.addEventListener(g, start, { passive: true }));

    return () => {
      cleanupGestures();
      clearTimeout(honkTimer);
      engine.pause();
      honk.pause();
    };
  }, []);

  return null;
}

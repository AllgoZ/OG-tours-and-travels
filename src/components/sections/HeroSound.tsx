"use client";

import { useEffect } from "react";

// Low volumes; the honk sits a bit under the engine roar.
const ENGINE_SRC = "/sounds/engine-roar.mp3";
const HONK_SRC = "/sounds/car-honk.mp3";
const ENGINE_VOLUME = 0.3;
const HONK_VOLUME = 0.15;
const HONK_DELAY_MS = 700; // honk sounds partway through the slide-in

/**
 * The hero vehicle drives in from the left on load (CSS, silent). Clicking/tapping the
 * vehicle replays that drive-in and plays the engine roar + a honk — a click is a user
 * gesture, so the browser allows the audio. Kept quiet; the honk a touch under the engine.
 * The visual replay is skipped for visitors who prefer reduced motion.
 */
export function HeroSound() {
  useEffect(() => {
    const el = document.getElementById("hero-vehicle");
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const engine = new Audio(ENGINE_SRC);
    engine.preload = "auto";
    engine.volume = ENGINE_VOLUME;

    const honk = new Audio(HONK_SRC);
    honk.preload = "auto";
    honk.volume = HONK_VOLUME;

    let honkTimer: ReturnType<typeof setTimeout> | undefined;

    const replay = () => {
      // Replay the drive-in animation.
      if (!reduced) {
        el.classList.remove("anim-drive");
        void el.offsetWidth; // force reflow so the animation can restart
        el.classList.add("anim-drive");
      }
      // Play engine from the start, then the honk partway through.
      clearTimeout(honkTimer);
      try {
        engine.currentTime = 0;
      } catch {}
      engine.play().catch(() => {});
      honk.pause();
      try {
        honk.currentTime = 0;
      } catch {}
      honkTimer = setTimeout(() => honk.play().catch(() => {}), HONK_DELAY_MS);
    };

    el.addEventListener("click", replay);
    return () => {
      el.removeEventListener("click", replay);
      clearTimeout(honkTimer);
      engine.pause();
      honk.pause();
    };
  }, []);

  return null;
}

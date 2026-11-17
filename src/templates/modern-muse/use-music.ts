"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Background music for the invitation.
 *
 * - One <audio> element for the whole session, owned by the shell: scrolling, section changes and
 *   language switches never restart the track.
 * - Nothing plays (or downloads) before a click. The gate's "Open" button calls `start()` from
 *   inside the click, which is what browsers require for sound; the nav control then toggles it.
 * - The control only appears when the file really exists: a HEAD request on mount confirms it, so a
 *   missing file never leaves a button that does nothing.
 */
export function useMusic(src: string | undefined) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((res) => {
        // Hosts with a single-page fallback answer 200 with HTML for missing files: not audio.
        const type = res.headers.get("content-type") ?? "";
        if (!cancelled) setExists(res.ok && !type.includes("text/html"));
      })
      .catch(() => {
        if (!cancelled) setExists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const ensure = useCallback(() => {
    if (!src) return null;
    if (!audio.current) {
      const a = new Audio(src);
      a.loop = true;
      a.preload = "auto";
      a.volume = 0.6;
      a.addEventListener("play", () => setPlaying(true));
      a.addEventListener("pause", () => setPlaying(false));
      a.addEventListener("error", () => {
        setPlaying(false);
        setExists(false);
      });
      audio.current = a;
    }
    return audio.current;
  }, [src]);

  /** Starts playback. Must be called from a user gesture; if the browser refuses, stay silent and "off". */
  const start = useCallback(() => {
    ensure()
      ?.play()
      .catch(() => setPlaying(false));
  }, [ensure]);

  const toggle = useCallback(() => {
    const a = ensure();
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [ensure]);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  return { available: !!src && exists, playing, start, toggle };
}

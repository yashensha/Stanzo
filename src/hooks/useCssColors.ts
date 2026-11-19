import { useEffect, useState } from 'react';

/**
 * Resolves CSS custom properties (e.g. `--color-terracotta`) to concrete colour strings,
 * re-reading them when the theme class on <html> changes. Needed for canvas-based
 * drawing (waveforms, meters), where `var(...)` is not a valid colour.
 */
export function useCssColors<K extends string>(vars: Record<K, string>): Record<K, string> {
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    const out = {} as Record<K, string>;
    for (const key of Object.keys(vars) as K[]) {
      out[key] = style.getPropertyValue(vars[key]).trim() || '#888';
    }
    return out;
  };

  const [colors, setColors] = useState<Record<K, string>>(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return colors;
}

/** mm:ss for a duration in seconds. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

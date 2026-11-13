import { useEffect } from 'react';

// Selektor elemen yang bisa difokus
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap untuk dialog/sheet: Tab tersiklus di dalam kontainer,
 * fokus awal pindah ke elemen pertama (opsional), dan saat tutup fokus
 * dipulihkan ke elemen sebelumnya. `autoFocus=false` dipakai kalau
 * komponen sudah memfokuskan sendiri (mis. FormSheet ke field pertama).
 */
export function useFocusTrap(ref, active, { autoFocus = true } = {}) {
  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;
    const previouslyFocused = document.activeElement;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

    if (autoFocus) {
      const first = getFocusable()[0];
      if (first) first.focus();
    }

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const current = document.activeElement;
      const index = focusable.indexOf(current);
      if (index === -1) {
        e.preventDefault();
        focusable[0].focus();
        return;
      }
      if (e.shiftKey && index === 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && index === focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [ref, active, autoFocus]);
}

import { useEffect, type RefObject } from "react";

const MAIN_SCROLL_SELECTOR = "[data-main-scroll]";

export function useScrollLock(
  enabled: boolean,
  triggerRef?: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!enabled) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const mainScroll = document.querySelector<HTMLElement>(MAIN_SCROLL_SELECTOR);
    let el: HTMLElement | null = mainScroll ?? triggerRef?.current ?? null;

    if (!mainScroll && el) {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        const o = style.overflow;
        if (
          oy === "auto" ||
          oy === "scroll" ||
          o === "auto" ||
          o === "scroll"
        ) {
          break;
        }
        el = el.parentElement;
      }
    }

    const lockedEl = el;
    if (lockedEl) {
      const prevOverflow = lockedEl.style.overflow;
      const prevOverflowY = lockedEl.style.overflowY;
      lockedEl.style.overflow = "hidden";
      lockedEl.style.overflowY = "hidden";

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
        lockedEl.style.overflow = prevOverflow;
        lockedEl.style.overflowY = prevOverflowY;
      };
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [enabled, triggerRef]);
}

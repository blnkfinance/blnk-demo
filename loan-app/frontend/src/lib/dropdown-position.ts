export type DropdownPosition = {
  top?: number;
  bottom?: number;
  left: number;
  openAbove: boolean;
};

export type GetDropdownPositionOptions = {
  menuWidth: number;
  gap?: number;
  viewportPadding?: number;
  openAboveThreshold?: number;
  align: "left" | "right";
};

export function getDropdownPosition(
  triggerRect: DOMRect,
  options: GetDropdownPositionOptions
): DropdownPosition {
  const {
    menuWidth,
    gap = 8,
    viewportPadding = 8,
    openAboveThreshold = 120,
    align,
  } = options;

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const spaceBelow = viewportHeight - triggerRect.bottom - viewportPadding;
  const spaceAbove = triggerRect.top - viewportPadding;
  const openAbove =
    spaceBelow < openAboveThreshold && spaceAbove > spaceBelow;

  let left: number;
  if (align === "right") {
    left = triggerRect.right - menuWidth;
  } else {
    left = triggerRect.left;
  }
  left = Math.max(
    viewportPadding,
    Math.min(left, viewportWidth - menuWidth - viewportPadding)
  );

  if (openAbove) {
    return {
      bottom: viewportHeight - triggerRect.top + gap,
      left,
      openAbove: true,
    };
  }
  return {
    top: triggerRect.bottom + gap,
    left,
    openAbove: false,
  };
}

export type GetSubmenuPositionOptions = {
  submenuWidth: number;
  submenuMaxHeight: number;
  gap?: number;
  viewportPadding?: number;
};

export function getSubmenuPosition(
  anchorRect: DOMRect,
  options: GetSubmenuPositionOptions
): { top: number; left: number } {
  const {
    submenuWidth,
    submenuMaxHeight,
    gap = 4,
    viewportPadding = 8,
  } = options;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left: number;
  const wouldGoOffRight = anchorRect.right + gap + submenuWidth > viewportWidth;
  if (wouldGoOffRight) {
    left = anchorRect.left - submenuWidth - gap;
  } else {
    left = anchorRect.right + gap;
  }
  left = Math.max(
    viewportPadding,
    Math.min(left, viewportWidth - submenuWidth - viewportPadding)
  );

  let top = anchorRect.top;
  if (top + submenuMaxHeight > viewportHeight - viewportPadding) {
    top = viewportHeight - submenuMaxHeight - viewportPadding;
  }
  if (top < viewportPadding) {
    top = viewportPadding;
  }

  return { top, left };
}

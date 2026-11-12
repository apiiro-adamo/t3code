import type { PointerEvent as ReactPointerEvent } from "react";
import { create } from "zustand";

import { updateClientSettings, useClientSettings } from "../../hooks/useSettings";

// Keep in sync with --thread-details-panel-width, which sizes the popover card.
const THREAD_DETAILS_PANEL_DEFAULT_WIDTH = 248;
const THREAD_DETAILS_PANEL_MIN_WIDTH = 200;
const THREAD_DETAILS_PANEL_MAX_WIDTH = 440;

function clampThreadDetailsPanelWidth(width: number) {
  return Math.round(
    Math.min(THREAD_DETAILS_PANEL_MAX_WIDTH, Math.max(THREAD_DETAILS_PANEL_MIN_WIDTH, width)),
  );
}

// The width follows the pointer here while a resize drag runs, and is saved once it ends.
const useResizeDrag = create<{ width: number | null }>(() => ({ width: null }));

/** The inline thread details card's width, following a resize drag while one runs. */
export function useThreadDetailsPanelWidth(): number {
  const saved = useClientSettings((settings) => settings.threadDetailsPanelWidth);
  const dragging = useResizeDrag((state) => state.width);
  return clampThreadDetailsPanelWidth(dragging ?? saved);
}

/** Resizes the card from its left edge, so dragging left widens it. */
export function startThreadDetailsPanelResize(
  event: ReactPointerEvent<HTMLElement>,
  startWidth: number,
) {
  if (event.button !== 0) return;
  event.preventDefault();
  const handle = event.currentTarget;
  const startX = event.clientX;
  handle.setPointerCapture(event.pointerId);
  const onMove = (move: PointerEvent) =>
    useResizeDrag.setState({
      width: clampThreadDetailsPanelWidth(startWidth + startX - move.clientX),
    });
  const onEnd = () => {
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onEnd);
    handle.removeEventListener("pointercancel", onEnd);
    const width = useResizeDrag.getState().width;
    if (width === null || width === startWidth) {
      useResizeDrag.setState({ width: null });
      return;
    }
    // Holds the dragged width until the saved one arrives, so the card never jumps back.
    void updateClientSettings({ threadDetailsPanelWidth: width }).finally(() =>
      useResizeDrag.setState({ width: null }),
    );
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onEnd);
  handle.addEventListener("pointercancel", onEnd);
}

export function resetThreadDetailsPanelWidth() {
  void updateClientSettings({ threadDetailsPanelWidth: THREAD_DETAILS_PANEL_DEFAULT_WIDTH });
}

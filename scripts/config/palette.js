/**
 * Colours painted into the canvas scenes, as "r,g,b" strings ready for rgba().
 *
 * These are intentionally NOT the CSS tokens in styles/tokens.css. The page is
 * warm paper with darkened, print-legible tints; the scenes are dark instrument
 * panels where the same hues have to glow. Two contexts, two sets of values —
 * keeping them apart is what stops one from being tuned at the other's expense.
 */
export const SCENE_COLORS = {
  /** luminous amber, for signal on a dark panel */
  amber: "227,177,95",
  /** thermal orange — DeepVision density peaks, CliniScan finding */
  heat: "224,114,74",
  /** clinical teal — CliniScan */
  clinic: "127,209,201",
  /** segment green */
  green: "163,197,133",
  /** panel foreground */
  ivory: "242,237,227",
};

/** Colours drawn onto the bright page itself (the prologue canvas). */
export const PAGE_COLORS = {
  amber: "168,123,45",
  ink: "32,36,46",
};

export const GRID_STROKE = `rgba(${SCENE_COLORS.ivory},.05)`;

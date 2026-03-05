/**
 * Colors for group bracket lines, indexed by bracketIndex.
 * Uses Docusaurus CSS custom properties so they adapt to light/dark themes.
 */
const BRACKET_COLORS = [
  'var(--ifm-color-info)',
  'var(--ifm-color-warning)',
  'var(--ifm-color-success)',
];

/**
 * Returns the right-offset (in rem) for a bracket line.
 * Brackets are positioned from the right edge of the cell so they appear
 * on the right side of the table, away from the tree connector lines.
 *
 *   B=0 → 0.50 rem from right
 *   B=1 → 0.75 rem from right
 *   B=2 → 1.00 rem from right
 */
export const getBracketPosition = (bracketIndex) => 0.5 + bracketIndex * 0.25;

export const getBracketColor = (bracketIndex) =>
  BRACKET_COLORS[bracketIndex % BRACKET_COLORS.length];

/** Width of horizontal cap lines in pixels */
const CAP_WIDTH = 10;

/** Inset from cell edge for cap lines (so they aren't hidden by table borders) */
const CAP_INSET = 6;

/** Helper to create a bracket key for Set lookups */
const bracketKey = (b) => `${b.level}:${b.bracketIndex}`;

/**
 * Generates inline styles for bracket lines positioned on the right side.
 * Supports optional horizontal "cap" lines at the top and/or bottom of
 * brackets to visually delineate where a bracket group starts and ends.
 *
 * @param {Array<{level: number, bracketIndex: number}>} groupBrackets - Active bracket groups
 * @param {object} [caps] - Optional cap configuration
 * @param {Array<{level: number, bracketIndex: number}>} [caps.starting] - Brackets needing a top cap
 * @param {Array<{level: number, bracketIndex: number}>} [caps.ending] - Brackets needing a bottom cap
 * @returns {object} Style object with background gradients
 */
export const getBracketLinesStyle = (groupBrackets = [], caps = {}) => {
  if (groupBrackets.length === 0) return {};

  const startingKeys = new Set((caps.starting || []).map(bracketKey));
  const endingKeys = new Set((caps.ending || []).map(bracketKey));

  const gradients = [];
  const sizes = [];
  const positions = [];

  groupBrackets.forEach((bracket) => {
    const { bracketIndex } = bracket;
    const pos = getBracketPosition(bracketIndex);
    const color = getBracketColor(bracketIndex);
    const key = bracketKey(bracket);
    const isStarting = startingKeys.has(key);
    const isEnding = endingKeys.has(key);

    // Vertical line — shortened when caps are present so it doesn't bleed past them
    const topInset = isStarting ? CAP_INSET : 0;
    const bottomInset = isEnding ? CAP_INSET : 0;
    gradients.push(`linear-gradient(${color}, ${color})`);
    sizes.push(`1px calc(100% - ${topInset + bottomInset}px)`);
    positions.push(`right ${pos}rem top ${topInset}px`);

    // Horizontal cap at the top (bracket start) — inset from cell edge
    if (isStarting) {
      const capOffset = (CAP_WIDTH - 1) / 2; // center cap on the vertical line
      gradients.push(`linear-gradient(${color}, ${color})`);
      sizes.push(`${CAP_WIDTH}px 1px`);
      positions.push(
        `right calc(${pos}rem - ${capOffset}px) top ${CAP_INSET}px`,
      );
    }

    // Horizontal cap at the bottom (bracket end) — inset from cell edge
    if (isEnding) {
      const capOffset = (CAP_WIDTH - 1) / 2;
      gradients.push(`linear-gradient(${color}, ${color})`);
      sizes.push(`${CAP_WIDTH}px 1px`);
      positions.push(
        `right calc(${pos}rem - ${capOffset}px) bottom ${CAP_INSET}px`,
      );
    }
  });

  return {
    backgroundImage: gradients.join(', '),
    backgroundSize: sizes.join(', '),
    backgroundPosition: positions.join(', '),
    backgroundRepeat: 'no-repeat',
  };
};

/**
 * Merges two background-gradient style objects into one.
 * @param {object} style1 - First style object
 * @param {object} style2 - Second style object
 * @returns {object} Merged style object
 */
export const mergeBackgroundStyles = (style1, style2) => {
  if (!style2.backgroundImage) return style1;
  if (!style1.backgroundImage) return { ...style1, ...style2 };

  return {
    ...style1,
    backgroundImage: `${style1.backgroundImage}, ${style2.backgroundImage}`,
    backgroundSize: `${style1.backgroundSize}, ${style2.backgroundSize}`,
    backgroundPosition: `${style1.backgroundPosition}, ${style2.backgroundPosition}`,
    backgroundRepeat: 'no-repeat',
  };
};

/**
 * Generates inline styles for continuing hierarchical lines through a row.
 * Only handles tree connector lines (left side). Bracket lines are separate.
 * @param {number[]} continuingLevels - Array of ancestor levels that need lines
 * @param {number} level - Current level of the row
 * @returns {object} Style object with background gradients
 */
export const getContinuingLinesStyle = (continuingLevels = [], level = 0) => {
  const getLevelPosition = (lvl) => lvl * 1.25 + 0.5;

  const allGradients = [];
  const allSizes = [];
  const allPositions = [];

  // Draw continuing lines for all ancestor levels
  continuingLevels.forEach((lvl) => {
    const pos = getLevelPosition(lvl);
    allGradients.push(
      'linear-gradient(var(--ifm-table-border-color), var(--ifm-table-border-color))',
    );
    allSizes.push('1px 100%');
    allPositions.push(`${pos}rem top`);
  });

  // Also draw the line for the immediate parent level (level - 1) if level > 0
  // This connects the rows to their parent property
  if (level > 0) {
    const parentPos = getLevelPosition(level - 1);
    if (!continuingLevels.includes(level - 1)) {
      allGradients.push(
        'linear-gradient(var(--ifm-table-border-color), var(--ifm-table-border-color))',
      );
      allSizes.push('1px 100%');
      allPositions.push(`${parentPos}rem top`);
    }
  }

  // Calculate indentation based on level
  const paddingLeft = `${level * 1.25 + 0.5}rem`;

  if (allGradients.length === 0) {
    return { paddingLeft };
  }

  return {
    paddingLeft,
    backgroundImage: allGradients.join(', '),
    backgroundSize: allSizes.join(', '),
    backgroundPosition: allPositions.join(', '),
    backgroundRepeat: 'no-repeat',
  };
};

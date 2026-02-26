/**
 * Generates inline styles for continuing hierarchical lines through a row.
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

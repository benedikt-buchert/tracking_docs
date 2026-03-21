import {
  getBracketPosition,
  getBracketColor,
  getBracketLinesStyle,
  mergeBackgroundStyles,
  getContinuingLinesStyle,
} from '../../helpers/continuingLinesStyle';

describe('getBracketPosition', () => {
  it('returns 0.5 for bracketIndex 0', () => {
    expect(getBracketPosition(0)).toBe(0.5);
  });

  it('returns 0.75 for bracketIndex 1', () => {
    expect(getBracketPosition(1)).toBe(0.75);
  });

  it('returns 1.0 for bracketIndex 2', () => {
    expect(getBracketPosition(2)).toBe(1.0);
  });

  it('returns 1.25 for bracketIndex 3', () => {
    expect(getBracketPosition(3)).toBe(1.25);
  });

  it('increases position with each index (uses addition not subtraction)', () => {
    expect(getBracketPosition(1)).toBeGreaterThan(getBracketPosition(0));
    expect(getBracketPosition(2)).toBeGreaterThan(getBracketPosition(1));
  });

  it('uses multiplication not division for step size', () => {
    const step = getBracketPosition(1) - getBracketPosition(0);
    expect(step).toBe(0.25);
  });
});

describe('getBracketColor', () => {
  it('returns the first color for index 0', () => {
    expect(getBracketColor(0)).toBe('var(--ifm-color-info)');
  });

  it('returns the second color for index 1', () => {
    expect(getBracketColor(1)).toBe('var(--ifm-color-warning)');
  });

  it('returns the third color for index 2', () => {
    expect(getBracketColor(2)).toBe('var(--ifm-color-success)');
  });

  it('wraps around using modulo — index 3 returns first color again', () => {
    expect(getBracketColor(3)).toBe(getBracketColor(0));
  });

  it('wraps around using modulo — index 4 returns second color again', () => {
    expect(getBracketColor(4)).toBe(getBracketColor(1));
  });

  it('uses modulo not multiplication (does not go out of array bounds)', () => {
    expect(() => getBracketColor(10)).not.toThrow();
    expect(getBracketColor(10)).toBeDefined();
  });
});

describe('getBracketLinesStyle', () => {
  it('returns empty object for empty groupBrackets', () => {
    expect(getBracketLinesStyle([])).toEqual({});
  });

  it('returns empty object when groupBrackets defaults to empty', () => {
    expect(getBracketLinesStyle()).toEqual({});
  });

  it('returns style object with all background properties for a single bracket', () => {
    const result = getBracketLinesStyle([{ level: 0, bracketIndex: 0 }]);
    expect(result).toHaveProperty('backgroundImage');
    expect(result).toHaveProperty('backgroundSize');
    expect(result).toHaveProperty('backgroundPosition');
    expect(result).toHaveProperty('backgroundRepeat', 'no-repeat');
  });

  it('produces exactly one gradient for a bracket with no caps', () => {
    const result = getBracketLinesStyle([{ level: 0, bracketIndex: 0 }], {});
    const gradientCount = (
      result.backgroundImage.match(/linear-gradient/g) || []
    ).length;
    expect(gradientCount).toBe(1);
  });

  it('produces two gradients for a bracket with starting cap', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], {
      starting: [bracket],
    });
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(2);
  });

  it('produces two gradients for a bracket with ending cap', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], {
      ending: [bracket],
    });
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(2);
  });

  it('produces three gradients for a bracket with both starting and ending caps', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], {
      starting: [bracket],
      ending: [bracket],
    });
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(3);
  });

  it('includes the bracket color in the gradient', () => {
    const result = getBracketLinesStyle([{ level: 0, bracketIndex: 0 }]);
    expect(result.backgroundImage).toContain('var(--ifm-color-info)');
  });

  it('uses bracketIndex 1 color for bracketIndex 1', () => {
    const result = getBracketLinesStyle([{ level: 0, bracketIndex: 1 }]);
    expect(result.backgroundImage).toContain('var(--ifm-color-warning)');
  });

  it('positions the line at the correct rem offset', () => {
    const result = getBracketLinesStyle([{ level: 0, bracketIndex: 0 }]);
    expect(result.backgroundPosition).toContain('right 0.5rem');
  });

  it('positions bracketIndex 1 further right than bracketIndex 0', () => {
    const result0 = getBracketLinesStyle([{ level: 0, bracketIndex: 0 }]);
    const result1 = getBracketLinesStyle([{ level: 0, bracketIndex: 1 }]);
    expect(result1.backgroundPosition).toContain('right 0.75rem');
    expect(result0.backgroundPosition).toContain('right 0.5rem');
  });

  it('produces a full-height line (100%) when no caps', () => {
    const result = getBracketLinesStyle([{ level: 0, bracketIndex: 0 }]);
    expect(result.backgroundSize).toContain('1px calc(100% - 0px)');
  });

  it('shortens line height when starting cap is present (inset from top)', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], { starting: [bracket] });
    // CAP_INSET is 6, so top inset = 6, bottom = 0 → calc(100% - 6px)
    expect(result.backgroundSize).toContain('1px calc(100% - 6px)');
  });

  it('shortens line height when ending cap is present (inset from bottom)', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], { ending: [bracket] });
    expect(result.backgroundSize).toContain('1px calc(100% - 6px)');
  });

  it('shortens line height by 12px when both caps are present', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], {
      starting: [bracket],
      ending: [bracket],
    });
    expect(result.backgroundSize).toContain('1px calc(100% - 12px)');
  });

  it('cap size uses CAP_WIDTH (10px) not some other value', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], { starting: [bracket] });
    // The cap entry is "10px 1px"
    expect(result.backgroundSize).toContain('10px 1px');
  });

  it('starting cap is positioned at top CAP_INSET (6px)', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], { starting: [bracket] });
    expect(result.backgroundPosition).toContain('top 6px');
  });

  it('ending cap is positioned at bottom CAP_INSET (6px)', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], { ending: [bracket] });
    expect(result.backgroundPosition).toContain('bottom 6px');
  });

  it('matches cap key by level:bracketIndex — a different bracket does not get a cap', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const otherBracket = { level: 1, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], {
      starting: [otherBracket],
    });
    // No cap → full height line
    expect(result.backgroundSize).toContain('1px calc(100% - 0px)');
    // Only one gradient (no cap added)
    expect(result.backgroundImage.split('), linear-gradient').length).toBe(1);
  });

  it('handles multiple brackets, producing one gradient entry per bracket', () => {
    const brackets = [
      { level: 0, bracketIndex: 0 },
      { level: 1, bracketIndex: 1 },
    ];
    const result = getBracketLinesStyle(brackets);
    // 2 brackets × 1 gradient each = 2 gradients
    expect(result.backgroundImage.split('), linear-gradient').length).toBe(2);
  });

  it('uses the correct cap offset formula: (CAP_WIDTH - 1) / 2 = 4.5px', () => {
    const bracket = { level: 0, bracketIndex: 0 };
    const result = getBracketLinesStyle([bracket], { starting: [bracket] });
    // capOffset = (10 - 1) / 2 = 4.5
    expect(result.backgroundPosition).toContain('calc(0.5rem - 4.5px)');
  });
});

describe('mergeBackgroundStyles', () => {
  const styleA = {
    backgroundImage: 'linear-gradient(red, red)',
    backgroundSize: '1px 100%',
    backgroundPosition: '1rem top',
    backgroundRepeat: 'no-repeat',
  };

  const styleB = {
    backgroundImage: 'linear-gradient(blue, blue)',
    backgroundSize: '2px 100%',
    backgroundPosition: '2rem top',
    backgroundRepeat: 'no-repeat',
  };

  it('returns style1 when style2 has no backgroundImage', () => {
    expect(mergeBackgroundStyles(styleA, {})).toEqual(styleA);
  });

  it('returns style2 spread over style1 when style1 has no backgroundImage', () => {
    const result = mergeBackgroundStyles({}, styleB);
    expect(result).toMatchObject(styleB);
  });

  it('preserves style1 properties when style1 has no backgroundImage', () => {
    const style1WithExtra = { paddingLeft: '1rem' };
    const result = mergeBackgroundStyles(style1WithExtra, styleB);
    expect(result.paddingLeft).toBe('1rem');
    expect(result.backgroundImage).toBe(styleB.backgroundImage);
  });

  it('merges backgroundImage from both styles', () => {
    const result = mergeBackgroundStyles(styleA, styleB);
    expect(result.backgroundImage).toBe(
      `${styleA.backgroundImage}, ${styleB.backgroundImage}`,
    );
  });

  it('merges backgroundSize from both styles', () => {
    const result = mergeBackgroundStyles(styleA, styleB);
    expect(result.backgroundSize).toBe(
      `${styleA.backgroundSize}, ${styleB.backgroundSize}`,
    );
  });

  it('merges backgroundPosition from both styles', () => {
    const result = mergeBackgroundStyles(styleA, styleB);
    expect(result.backgroundPosition).toBe(
      `${styleA.backgroundPosition}, ${styleB.backgroundPosition}`,
    );
  });

  it('sets backgroundRepeat to no-repeat in merged result', () => {
    const result = mergeBackgroundStyles(styleA, styleB);
    expect(result.backgroundRepeat).toBe('no-repeat');
  });

  it('preserves other style1 properties in the merged result', () => {
    const extended = { ...styleA, paddingLeft: '1rem' };
    const result = mergeBackgroundStyles(extended, styleB);
    expect(result.paddingLeft).toBe('1rem');
  });

  it('order matters — style1 backgroundImage comes first', () => {
    const result = mergeBackgroundStyles(styleA, styleB);
    expect(result.backgroundImage.startsWith(styleA.backgroundImage)).toBe(
      true,
    );
  });
});

describe('getContinuingLinesStyle', () => {
  it('returns just paddingLeft when no continuingLevels and level 0', () => {
    expect(getContinuingLinesStyle([], 0)).toEqual({ paddingLeft: '0.5rem' });
  });

  it('returns just paddingLeft when no continuingLevels and level > 0', () => {
    // level 1 → paddingLeft = 1*1.25 + 0.5 = 1.75rem
    // level > 0 draws parent line only if not already in continuingLevels
    // continuingLevels is empty so parent line IS drawn → not just paddingLeft
    const result = getContinuingLinesStyle([], 1);
    expect(result.paddingLeft).toBe('1.75rem');
    expect(result.backgroundImage).toBeDefined();
  });

  it('returns paddingLeft only when level is 0 with no continuingLevels', () => {
    const result = getContinuingLinesStyle([], 0);
    expect(Object.keys(result)).toEqual(['paddingLeft']);
  });

  it('calculates paddingLeft correctly for level 0: 0*1.25+0.5 = 0.5rem', () => {
    expect(getContinuingLinesStyle([], 0).paddingLeft).toBe('0.5rem');
  });

  it('calculates paddingLeft correctly for level 1: 1*1.25+0.5 = 1.75rem', () => {
    expect(getContinuingLinesStyle([], 1).paddingLeft).toBe('1.75rem');
  });

  it('calculates paddingLeft correctly for level 2: 2*1.25+0.5 = 3rem', () => {
    expect(getContinuingLinesStyle([], 2).paddingLeft).toBe('3rem');
  });

  it('uses multiplication not division in paddingLeft formula', () => {
    // if it were division: 2/1.25+0.5 = 2.1rem, multiplication gives 3rem
    expect(getContinuingLinesStyle([], 2).paddingLeft).toBe('3rem');
  });

  it('adds background styles when continuingLevels is non-empty', () => {
    const result = getContinuingLinesStyle([0], 1);
    expect(result).toHaveProperty('backgroundImage');
    expect(result).toHaveProperty('backgroundSize');
    expect(result).toHaveProperty('backgroundPosition');
    expect(result).toHaveProperty('backgroundRepeat', 'no-repeat');
  });

  it('draws one gradient per continuing level', () => {
    const result = getContinuingLinesStyle([0, 1], 3);
    // 2 continuing levels + 1 parent line (level 2, not in continuingLevels) = 3 gradients
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(3);
  });

  it('does not add parent line when level is 0', () => {
    const result = getContinuingLinesStyle([0], 0);
    // Only 1 continuing level, no parent line (level 0 has no parent)
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(1);
  });

  it('adds parent line when level > 0 and parent not in continuingLevels', () => {
    const result = getContinuingLinesStyle([], 1);
    // 0 continuing + 1 parent = 1 gradient total
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(1);
  });

  it('does not add duplicate parent line when parent already in continuingLevels', () => {
    // level=1, so parent is level=0; continuingLevels includes 0 already
    const result = getContinuingLinesStyle([0], 1);
    // 1 continuing level (0) + no extra parent line = 1 gradient
    const gradientCount =
      result.backgroundImage.split('), linear-gradient').length;
    expect(gradientCount).toBe(1);
  });

  it('uses level - 1 not level for parent position calculation', () => {
    const resultL1 = getContinuingLinesStyle([], 1);
    const resultL2 = getContinuingLinesStyle([], 2);
    // level 1 → parent at level 0 → pos = 0*1.25+0.5 = 0.5rem
    // level 2 → parent at level 1 → pos = 1*1.25+0.5 = 1.75rem
    expect(resultL1.backgroundPosition).toContain('0.5rem');
    expect(resultL2.backgroundPosition).toContain('1.75rem');
  });

  it('positions each continuing level correctly', () => {
    const result = getContinuingLinesStyle([0], 2);
    // level 0 position: 0*1.25+0.5 = 0.5rem
    expect(result.backgroundPosition).toContain('0.5rem');
  });

  it('uses 100% height for all gradient lines', () => {
    const result = getContinuingLinesStyle([0], 2);
    expect(result.backgroundSize).toContain('1px 100%');
  });

  it('uses the table border color CSS variable', () => {
    const result = getContinuingLinesStyle([0], 2);
    expect(result.backgroundImage).toContain('var(--ifm-table-border-color)');
  });

  it('defaults continuingLevels to [] when not provided', () => {
    expect(() => getContinuingLinesStyle()).not.toThrow();
    expect(getContinuingLinesStyle()).toEqual({ paddingLeft: '0.5rem' });
  });

  it('defaults level to 0 when not provided', () => {
    expect(getContinuingLinesStyle([])).toEqual({ paddingLeft: '0.5rem' });
  });

  it('level comparison is strictly > 0, not >= 0', () => {
    // level 0: no parent line added
    const atZero = getContinuingLinesStyle([], 0);
    expect(Object.keys(atZero)).toEqual(['paddingLeft']);

    // level 1: parent line added
    const atOne = getContinuingLinesStyle([], 1);
    expect(atOne).toHaveProperty('backgroundImage');
  });
});

import {
  DEFAULT_TRACKING_TARGET,
  resolveTrackingTargets,
} from '../../helpers/trackingTargets';

describe('trackingTargets', () => {
  it('returns the configured targets when valid', () => {
    const schema = {
      'x-tracking-targets': ['web-datalayer-js', 'android-firebase-java-sdk'],
    };

    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });
    expect(result).toEqual({
      targets: ['web-datalayer-js', 'android-firebase-java-sdk'],
      warning: null,
      errors: [],
    });
  });

  it('falls back to default target when key is missing', () => {
    const result = resolveTrackingTargets(
      {},
      { schemaFile: 'event.json', isQuiet: false },
    );

    expect(result.targets).toEqual([DEFAULT_TRACKING_TARGET]);
    expect(result.errors).toEqual([]);
    expect(result.warning).toContain(DEFAULT_TRACKING_TARGET);
  });

  it('returns an error for unknown targets', () => {
    const schema = {
      'x-tracking-targets': ['web-not-supported-js'],
    };

    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('web-not-supported-js');
  });

  // L17: optional chaining — x-tracking-targets explicitly set to null
  it('falls back to default when x-tracking-targets is null', () => {
    const schema = { 'x-tracking-targets': null };
    const result = resolveTrackingTargets(schema, {
      schemaFile: 'event.json',
      isQuiet: false,
    });

    expect(result.targets).toEqual([DEFAULT_TRACKING_TARGET]);
    expect(result.errors).toEqual([]);
    expect(result.warning).not.toBeNull();
    expect(result.warning).toContain('event.json');
    expect(result.warning).toContain(DEFAULT_TRACKING_TARGET);
  });

  // L17: optional chaining — schema itself is null/undefined
  it('falls back to default when schema is null', () => {
    const result = resolveTrackingTargets(null, {
      schemaFile: 'missing.json',
      isQuiet: false,
    });

    expect(result.targets).toEqual([DEFAULT_TRACKING_TARGET]);
    expect(result.errors).toEqual([]);
    expect(result.warning).toContain('missing.json');
  });

  // L15, L60-63: warning contains schemaFile name
  it('warning message includes the schemaFile name', () => {
    const result = resolveTrackingTargets(
      {},
      { schemaFile: 'my-custom-event.json', isQuiet: false },
    );

    expect(result.warning).toContain('my-custom-event.json');
    expect(result.warning).toContain('x-tracking-targets');
  });

  // L15: isQuiet suppresses the warning (null instead of string)
  it('returns null warning when isQuiet is true and key is missing', () => {
    const result = resolveTrackingTargets(
      {},
      { schemaFile: 'event.json', isQuiet: true },
    );

    expect(result.targets).toEqual([DEFAULT_TRACKING_TARGET]);
    expect(result.warning).toBeNull();
    expect(result.errors).toEqual([]);
  });

  // L31 first condition: x-tracking-targets is not an array
  it('returns an error when x-tracking-targets is not an array', () => {
    const schema = { 'x-tracking-targets': 'web-datalayer-js' };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('non-empty array');
    expect(result.warning).toBeNull();
  });

  // L31 length === 0: x-tracking-targets is empty array
  it('returns an error when x-tracking-targets is an empty array', () => {
    const schema = { 'x-tracking-targets': [] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('non-empty array');
    expect(result.warning).toBeNull();
  });

  // L33: x-tracking-targets contains non-string values
  it('returns an error when x-tracking-targets contains non-string values', () => {
    const schema = { 'x-tracking-targets': [42, true] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('non-empty array of string target IDs');
    expect(result.warning).toBeNull();
  });

  // L33: mixed array with at least one non-string
  it('returns an error when x-tracking-targets mixes strings and non-strings', () => {
    const schema = { 'x-tracking-targets': ['web-datalayer-js', 99] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('non-empty array of string target IDs');
  });

  // L52: error message text for unsupported targets
  it('error for unsupported targets mentions "unsupported target(s)"', () => {
    const schema = { 'x-tracking-targets': ['foo-bar-baz'] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors.some((e) => e.includes('unsupported target(s)'))).toBe(
      true,
    );
  });

  // L58: badly formatted target ID (does not match kebab-case pattern)
  it('returns an error for badly formatted target IDs', () => {
    // Provide a target that passes the supported check but fails the pattern check
    // by simulating a value that would be "known" but wrongly formatted.
    // Since SUPPORTED_TRACKING_TARGETS are all valid, use a value that fails the regex.
    const schema = { 'x-tracking-targets': ['UPPERCASE-TARGET-ID'] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    // Should have at least one error (unsupported, and also badly formatted)
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // L60: error message contains the invalid value
  it('badly formatted error message lists the invalid values', () => {
    const schema = { 'x-tracking-targets': ['bad_format'] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    const formatError = result.errors.find((e) =>
      e.includes('lowercase kebab-case'),
    );
    expect(formatError).toBeDefined();
    expect(formatError).toContain('bad_format');
  });

  // targets are returned only when there are no errors
  it('returns empty targets array when there are errors', () => {
    const schema = { 'x-tracking-targets': ['invalid_format'] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // targets are returned when there are no errors (the ternary on last return)
  it('returns the configured targets when no errors are found', () => {
    const schema = { 'x-tracking-targets': ['web-datalayer-js'] };
    const result = resolveTrackingTargets(schema, { schemaFile: 'event.json' });

    expect(result.targets).toEqual(['web-datalayer-js']);
    expect(result.errors).toEqual([]);
    expect(result.warning).toBeNull();
  });

  // L15: default-arg — omit second argument entirely to trigger = {} default
  it('uses default options when second argument is omitted', () => {
    const result = resolveTrackingTargets({});

    expect(result.targets).toEqual([DEFAULT_TRACKING_TARGET]);
    expect(result.errors).toEqual([]);
    // schemaFile defaults to 'schema', isQuiet defaults to false
    expect(result.warning).toContain('schema');
    expect(result.warning).toContain(DEFAULT_TRACKING_TARGET);
  });

  // L15: default-arg — provide options object without schemaFile or isQuiet
  it('uses default schemaFile and isQuiet when keys are omitted from options', () => {
    const result = resolveTrackingTargets({}, {});

    expect(result.targets).toEqual([DEFAULT_TRACKING_TARGET]);
    expect(result.errors).toEqual([]);
    // schemaFile defaults to 'schema'
    expect(result.warning).toContain('schema');
  });
});

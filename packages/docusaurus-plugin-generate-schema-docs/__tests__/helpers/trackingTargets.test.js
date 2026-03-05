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
});

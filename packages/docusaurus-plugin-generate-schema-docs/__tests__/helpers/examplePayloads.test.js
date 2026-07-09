import { buildExamplePayloads } from '../../helpers/examplePayloads';

describe('buildExamplePayloads', () => {
  describe('when the schema produces a default example', () => {
    it('returns payload metadata for the generated example', () => {
      const schema = {
        type: 'object',
        properties: {
          user_id: { type: 'string', examples: ['user-123'] },
          plan: { type: 'string', examples: ['pro'] },
        },
      };

      expect(buildExamplePayloads(schema)).toEqual([
        {
          title: 'Example',
          variant: { property: 'default', option: 'Example' },
          payload: {
            user_id: 'user-123',
            plan: 'pro',
          },
        },
      ]);
    });
  });

  describe('when a variant produces no useful payload', () => {
    it('excludes undefined and empty object payloads', () => {
      const schema = {
        oneOf: [
          {
            title: 'Missing payload',
            type: 'object',
            properties: {},
          },
          {
            title: 'Empty payload',
            type: 'object',
            examples: [{}],
          },
          {
            title: 'Ready payload',
            type: 'object',
            properties: {
              event: { const: 'ready' },
            },
          },
        ],
      };

      expect(buildExamplePayloads(schema)).toEqual([
        {
          title: 'Ready payload',
          variant: { property: 'root', option: 'Ready payload' },
          payload: { event: 'ready' },
        },
      ]);
    });
  });

  describe('when the schema has multiple usable variants', () => {
    it('returns one payload for each variant option', () => {
      const schema = {
        type: 'object',
        properties: {
          plan: {
            oneOf: [
              { title: 'Free', const: 'free' },
              { title: 'Enterprise', const: 'enterprise' },
            ],
          },
        },
      };

      expect(buildExamplePayloads(schema)).toEqual([
        {
          title: 'Free',
          variant: { property: 'plan', option: 'Free' },
          payload: { plan: 'free' },
        },
        {
          title: 'Enterprise',
          variant: { property: 'plan', option: 'Enterprise' },
          payload: { plan: 'enterprise' },
        },
      ]);
    });
  });
});

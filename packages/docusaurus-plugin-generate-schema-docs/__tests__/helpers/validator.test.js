import { createValidator } from '../../helpers/validator';
import path from 'path';

describe('createValidator', () => {
  it('creates a validator that returns true for valid data with no schema version (draft-07)', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    };

    const validator = await createValidator([], schema);
    const result = validator({ name: 'test' });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('creates a validator that returns false for invalid data with no schema version (draft-07)', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    };

    const validator = await createValidator([], schema);
    const result = validator({ name: 123 });

    expect(result.valid).toBe(false);
    expect(result.errors).not.toEqual([]);
  });

  it('creates a validator that can validate against a draft-04 schema', async () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    };

    const validator = await createValidator([], schema);
    const result = validator({ name: 'test' });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('creates a validator that can validate against a draft-07 schema', async () => {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    };

    const validator = await createValidator([], schema);
    const result = validator({ name: 'test' });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('creates a validator that can validate against a 2019-09 schema', async () => {
    const schema = {
      $schema: 'https://json-schema.org/draft/2019-09/schema',
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    };

    const validator = await createValidator([], schema);
    const result = validator({ name: 'test' });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('creates a validator that can validate against a 2020-12 schema', async () => {
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    };

    const validator = await createValidator([], schema);
    const result = validator({ name: 'test' });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('resolves published /constraints refs to local constraint schemas', async () => {
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      allOf: [
        {
          $ref: 'https://tracking-docs-demo.buchert.digital/constraints/schemas/firebase/v1/flat-event-params.json',
        },
      ],
    };

    const schemaPath = path.resolve(
      __dirname,
      '../../../../demo/static/schemas/next',
    );
    const validator = await createValidator([], schema, schemaPath);

    const valid = validator({
      event: 'screen_view',
      screen_name: 'Checkout',
      attempt: 1,
    });
    expect(valid.valid).toBe(true);

    const invalid = validator({
      event: 'screen_view',
      nested: { disallowed: true },
    });
    expect(invalid.valid).toBe(false);
  });
});

import { createValidator } from '../../helpers/validator';

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

    const validator = await createValidator(schema);
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

    const validator = await createValidator(schema);
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

    const validator = await createValidator(schema);
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

    const validator = await createValidator(schema);
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

    const validator = await createValidator(schema);
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

    const validator = await createValidator(schema);
    const result = validator({ name: 'test' });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

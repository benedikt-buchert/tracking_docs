import { createValidator, clearSchemaFileCache } from '../../helpers/validator';
import { promises as fsPromises } from 'fs';
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

  describe('schema file caching', () => {
    beforeEach(() => {
      clearSchemaFileCache();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('reads each referenced schema file only once across concurrent validators', async () => {
      const componentSchema = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { id: { type: 'string' } },
      });

      const readFileSpy = jest
        .spyOn(fsPromises, 'readFile')
        .mockResolvedValue(componentSchema);

      const schemaWithRef = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { item: { $ref: 'components/products.json' } },
      };

      await Promise.all([
        createValidator([], { ...schemaWithRef }, '/schemas'),
        createValidator([], { ...schemaWithRef }, '/schemas'),
      ]);

      const componentReads = readFileSpy.mock.calls.filter(([p]) =>
        p.includes('products.json'),
      );
      expect(componentReads).toHaveLength(1);
    });
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

  describe('clearSchemaFileCache', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      clearSchemaFileCache();
    });

    it('clears the cache so subsequent file reads are performed again (L14)', async () => {
      let callCount = 0;
      const componentSchema = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { id: { type: 'string' } },
      });
      jest.spyOn(fsPromises, 'readFile').mockImplementation(() => {
        callCount++;
        return Promise.resolve(componentSchema);
      });

      const schemaWithRef = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { item: { $ref: 'parts/component.json' } },
      };

      // First call — populates cache
      await createValidator([], { ...schemaWithRef }, '/schemas');
      const countAfterFirst = callCount;

      // Clear cache — subsequent calls should re-read the file
      clearSchemaFileCache();

      // Second call — cache was cleared, so file must be read again
      await createValidator([], { ...schemaWithRef }, '/schemas');
      const countAfterSecond = callCount;

      expect(countAfterSecond).toBeGreaterThan(countAfterFirst);
    });
  });

  describe('readSchemaFile encoding (L22)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      clearSchemaFileCache();
    });

    it('reads schema files with utf-8 encoding', async () => {
      const componentSchema = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { id: { type: 'string' } },
      });
      const readFileSpy = jest
        .spyOn(fsPromises, 'readFile')
        .mockResolvedValue(componentSchema);

      const schemaWithRef = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { item: { $ref: 'parts/comp.json' } },
      };

      await createValidator([], { ...schemaWithRef }, '/schemas');

      const refCall = readFileSpy.mock.calls.find(([p]) =>
        p.includes('comp.json'),
      );
      expect(refCall).toBeDefined();
      expect(refCall[1]).toBe('utf-8');
    });
  });

  describe('optional chaining on mainSchema.$schema (L29)', () => {
    it('handles mainSchema with no $schema field without throwing', async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };
      // mainSchema has no $schema — schemaVersion must be undefined, not throw
      const validator = await createValidator([], schema);
      expect(validator({ name: 'hello' }).valid).toBe(true);
    });
  });

  describe('URI normalization (L38-L41)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      clearSchemaFileCache();
    });

    it('strips /schemas/ prefix from http URI pathnames when loading refs (L38, L40, L41)', async () => {
      const componentSchema = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { id: { type: 'string' } },
      });
      const readFileSpy = jest
        .spyOn(fsPromises, 'readFile')
        .mockResolvedValue(componentSchema);

      const schemaWithRef = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          item: {
            $ref: 'http://example.com/schemas/components/widget.json',
          },
        },
      };

      await createValidator([], { ...schemaWithRef }, '/base');

      const refCall = readFileSpy.mock.calls.find(([p]) =>
        p.includes('widget.json'),
      );
      expect(refCall).toBeDefined();
      // /schemas/ prefix should be stripped: path should be /base/components/widget.json
      expect(refCall[0]).toBe('/base/components/widget.json');
    });

    it('preserves full pathname for http URIs without /schemas/ prefix (L40)', async () => {
      const componentSchema = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { id: { type: 'string' } },
      });
      const readFileSpy = jest
        .spyOn(fsPromises, 'readFile')
        .mockResolvedValue(componentSchema);

      const schemaWithRef = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          item: {
            $ref: 'http://example.com/other/widget.json',
          },
        },
      };

      await createValidator([], { ...schemaWithRef }, '/base');

      const refCall = readFileSpy.mock.calls.find(([p]) =>
        p.includes('widget.json'),
      );
      expect(refCall).toBeDefined();
      // No /schemas/ prefix — full pathname is used
      expect(refCall[0]).toBe('/base/other/widget.json');
    });

    it('resolves relative URI refs against schemaPath (L38 else branch)', async () => {
      const componentSchema = JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { id: { type: 'string' } },
      });
      const readFileSpy = jest
        .spyOn(fsPromises, 'readFile')
        .mockResolvedValue(componentSchema);

      const schemaWithRef = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { item: { $ref: 'relative/schema.json' } },
      };

      await createValidator([], { ...schemaWithRef }, '/base');

      const refCall = readFileSpy.mock.calls.find(([p]) =>
        p.includes('schema.json'),
      );
      expect(refCall).toBeDefined();
      // Relative path resolved against /base
      expect(refCall[0]).toContain('relative/schema.json');
    });
  });

  describe('validation return shape (L51)', () => {
    it('returns errors array (not empty) when data is invalid', async () => {
      const schema = {
        type: 'object',
        properties: { count: { type: 'number' } },
        required: ['count'],
      };
      const validator = await createValidator([], schema);
      const result = validator({ count: 'not-a-number' });

      expect(result.valid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns empty errors array when data is valid', async () => {
      const schema = {
        type: 'object',
        properties: { count: { type: 'number' } },
        required: ['count'],
      };
      const validator = await createValidator([], schema);
      const result = validator({ count: 42 });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('draft-04 with $id and schemas array (L64, L91-L99)', () => {
    it('compiles draft-04 schema without $id using ajv.compile (L91-L94)', async () => {
      const schema = {
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };

      const validator = await createValidator([], schema);
      expect(validator({ name: 'Alice' }).valid).toBe(true);
      expect(validator({ name: 123 }).valid).toBe(false);
    });

    it('adds schemas from array for draft-04 so refs can be resolved (L64)', async () => {
      // draft-04 uses 'id' (not '$id') for schema identification
      const componentId = 'http://example.com/schemas/item-d4.json';
      const componentSchema = {
        id: componentId,
        type: 'object',
        properties: { label: { type: 'string' } },
        required: ['label'],
      };
      const mainSchema = {
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
          item: { $ref: componentId },
        },
        required: ['item'],
      };

      const validator = await createValidator([componentSchema], mainSchema);
      expect(validator({ item: { label: 'Widget' } }).valid).toBe(true);
      expect(validator({ item: { label: 42 } }).valid).toBe(false);
    });
  });

  describe('fallback branch when compileAsync is absent (L97-L100)', () => {
    it('uses ajv.getSchema when compileAsync is missing and mainSchema has $id (L98-L99)', async () => {
      const Ajv = (await import('ajv')).default;
      const origCompileAsync = Ajv.prototype.compileAsync;
      delete Ajv.prototype.compileAsync;

      try {
        const schema = {
          $id: 'http://example.com/schemas/test-no-compile-async.json',
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        };

        const validator = await createValidator([schema], schema);
        expect(validator({ name: 'Alice' }).valid).toBe(true);
        expect(validator({ name: 123 }).valid).toBe(false);
      } finally {
        Ajv.prototype.compileAsync = origCompileAsync;
      }
    });

    it('uses ajv.compile when compileAsync is missing and mainSchema has no $id (L98, L100)', async () => {
      const Ajv = (await import('ajv')).default;
      const origCompileAsync = Ajv.prototype.compileAsync;
      delete Ajv.prototype.compileAsync;

      try {
        const schema = {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        };

        const validator = await createValidator([], schema);
        expect(validator({ name: 'Bob' }).valid).toBe(true);
        expect(validator({ name: 42 }).valid).toBe(false);
      } finally {
        Ajv.prototype.compileAsync = origCompileAsync;
      }
    });
  });

  describe('addKeyword guard (L71)', () => {
    it('covers the addKeyword branch by verifying custom keywords are registered', async () => {
      // The L71 guard checks if ajv.addKeyword exists before calling it.
      // All standard Ajv instances have addKeyword, so L71 is always true.
      // We verify the keywords ARE added (covering L72-L73) by validating
      // a schema that uses x-gtm-clear — if addKeyword hadn't been called, Ajv strict mode would fail.
      const schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          name: { type: 'string', 'x-gtm-clear': true },
          targets: { type: 'array', 'x-tracking-targets': ['ga4'] },
        },
      };

      const validator = await createValidator([], schema);
      expect(validator({ name: 'test', targets: ['ga4'] }).valid).toBe(true);
    });
  });

  describe('error thrown when validate cannot be found (L103-L106)', () => {
    it('throws an error mentioning $id when schema has $id and cannot be found (L105-L106)', async () => {
      // Use draft-04 with a $id that is NOT pre-loaded in schemas, so getSchema returns undefined
      const schema = {
        $id: 'http://example.com/schemas/missing.json',
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: { name: { type: 'string' } },
      };

      // Pass empty schemas array so $id is not registered; getSchema returns undefined
      await expect(createValidator([], schema)).rejects.toThrow(
        'http://example.com/schemas/missing.json',
      );
    });

    it('throws an error mentioning "main schema" when schema has no $id (L106 fallback)', async () => {
      // Force validate to be falsy by mocking — use draft-04 path without $id but make compile return null
      // We do this by spying on AjvDraft4.prototype.compile
      const AjvDraft4 = (await import('ajv-draft-04')).default;
      const origCompile = AjvDraft4.prototype.compile;
      AjvDraft4.prototype.compile = () => null;

      try {
        const schema = {
          $schema: 'http://json-schema.org/draft-04/schema#',
          type: 'object',
        };
        await expect(createValidator([], schema)).rejects.toThrow(
          'main schema',
        );
      } finally {
        AjvDraft4.prototype.compile = origCompile;
      }
    });
  });
});

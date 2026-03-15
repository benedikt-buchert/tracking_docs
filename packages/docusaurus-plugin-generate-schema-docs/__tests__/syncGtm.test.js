/* eslint-env jest */
/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const gtmScript = require('../scripts/sync-gtm');
const { execSync } = require('child_process');
const RefParser = require('@apidevtools/json-schema-ref-parser');

jest.mock('fs');
jest.mock('child_process');
jest.mock('@apidevtools/json-schema-ref-parser');

describe('parseArgs', () => {
  it('should parse --quiet, --json, --remove-references, and --skip-array-sub-properties flags', () => {
    const argv = [
      'node',
      'script.js',
      '--quiet',
      '--json',
      '--remove-references',
      '--skip-array-sub-properties',
    ];
    const { isQuiet, isJson, removeReferences, skipArraySubProperties } =
      gtmScript.parseArgs(argv);
    expect(isQuiet).toBe(true);
    expect(isJson).toBe(true);
    expect(removeReferences).toBe(true);
    expect(skipArraySubProperties).toBe(true);
  });

  it('should parse --path argument', () => {
    const argv = ['node', 'script.js', '--path=./my-demo'];
    const { siteDir } = gtmScript.parseArgs(argv);
    expect(siteDir).toBe('./my-demo');
  });

  it('should default siteDir to .', () => {
    const argv = ['node', 'script.js'];
    const { siteDir } = gtmScript.parseArgs(argv);
    expect(siteDir).toBe('.');
  });
});

describe('getLatestSchemaPath', () => {
  const SITE_DIR = '/fake/site';
  const SCHEMAS_BASE_PATH = path.join(SITE_DIR, 'static', 'schemas');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return path to latest version when versions.json exists', () => {
    fs.existsSync.mockImplementation(
      (p) => p === path.join(SITE_DIR, 'versions.json'),
    );
    fs.readFileSync.mockReturnValue('["1.2.0", "1.1.1"]');
    const result = gtmScript.getLatestSchemaPath(SITE_DIR);
    expect(result).toBe(path.join(SCHEMAS_BASE_PATH, '1.2.0'));
  });

  it('should return path to "next" when versions.json does not exist', () => {
    const nextPath = path.join(SCHEMAS_BASE_PATH, 'next');
    fs.existsSync.mockImplementation((p) => p === nextPath);
    const result = gtmScript.getLatestSchemaPath(SITE_DIR);
    expect(result).toBe(nextPath);
  });

  it('should return base schemas path as fallback', () => {
    fs.existsSync.mockReturnValue(false);
    const result = gtmScript.getLatestSchemaPath(SITE_DIR);
    expect(result).toBe(SCHEMAS_BASE_PATH);
  });
});

describe('getVariablesFromSchemas', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const SCHEMA_PATH = '/fake/schemas';
  const mockFiles = {
    [SCHEMA_PATH]: ['complex-event.json', 'mobile-event.json', 'components'],
    [path.join(SCHEMA_PATH, 'components')]: ['address.json'],
  };
  const addressSchema = {
    title: 'Address',
    type: 'object',
    properties: {
      street: { type: 'string', description: 'Street name.' },
      city: { type: 'string', description: 'City name.' },
    },
  };
  const complexEventSchema = {
    title: 'Complex Event',
    'x-tracking-targets': ['web-datalayer-js'],
    type: 'object',
    properties: {
      $schema: { type: 'string', description: 'Should now be included.' },
      event: { type: 'string', const: 'user_update' },
      user_data: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'The user ID.' },
          addresses: {
            type: 'array',
            description: 'List of addresses.',
            items: { $ref: './components/address.json' },
          },
        },
      },
      contact_method: {
        type: 'object',
        oneOf: [
          {
            title: 'Email Contact',
            properties: {
              email: {
                type: 'string',
                description: 'Email address.',
              },
            },
          },
          {
            title: 'Phone Contact',
            properties: {
              phone_number: {
                type: 'string',
                description: 'Phone number.',
              },
            },
          },
        ],
      },
      platform: {
        type: 'string',
        description: 'Target platform.',
      },
      timestamp: { type: 'number', description: 'Event timestamp.' },
    },
    if: {
      properties: {
        platform: { const: 'ios' },
      },
    },
    then: {
      properties: {
        att_status: {
          type: 'string',
          description: 'App Tracking Transparency status.',
        },
      },
    },
    else: {
      properties: {
        ad_personalization_enabled: {
          type: 'boolean',
          description: 'Whether ad personalization is enabled.',
        },
      },
    },
  };
  const mobileEventSchema = {
    title: 'Mobile Event',
    'x-tracking-targets': ['android-firebase-kotlin-sdk'],
    type: 'object',
    properties: {
      event: { type: 'string', const: 'screen_view' },
      screen_name: { type: 'string', description: 'Screen name.' },
    },
  };
  const untaggedEventSchema = {
    title: 'Untagged Event',
    type: 'object',
    properties: {
      event: { type: 'string', const: 'legacy_event' },
      legacy_field: { type: 'string', description: 'Legacy field.' },
    },
  };
  const mockFileContents = {
    [path.join(SCHEMA_PATH, 'complex-event.json')]:
      JSON.stringify(complexEventSchema),
    [path.join(SCHEMA_PATH, 'mobile-event.json')]:
      JSON.stringify(mobileEventSchema),
    [path.join(SCHEMA_PATH, 'components', 'address.json')]:
      JSON.stringify(addressSchema),
  };

  beforeEach(() => {
    fs.readdirSync.mockImplementation((p) => mockFiles[p] || []);
    fs.statSync.mockImplementation((p) => ({
      isDirectory: () => !!mockFiles[p],
    }));
    fs.readFileSync.mockImplementation((p) => mockFileContents[p] || '');
    fs.existsSync.mockImplementation(
      (p) => !!mockFiles[p] || !!mockFileContents[p],
    );
    RefParser.bundle.mockClear();
  });

  it('should find all top-level variables, including $schema', async () => {
    const bundledSchema = JSON.parse(JSON.stringify(complexEventSchema));
    bundledSchema.properties.user_data.properties.addresses.items =
      addressSchema;
    RefParser.bundle.mockResolvedValue(bundledSchema);

    const result = await gtmScript.getVariablesFromSchemas(SCHEMA_PATH, {});

    const expected = expect.arrayContaining([
      expect.objectContaining({ name: '$schema' }),
      expect.objectContaining({ name: 'event' }),
      expect.objectContaining({ name: 'user_data' }),
      expect.objectContaining({ name: 'user_data.user_id' }),
      expect.objectContaining({ name: 'user_data.addresses' }),
      expect.objectContaining({ name: 'user_data.addresses.0.street' }),
      expect.objectContaining({ name: 'user_data.addresses.0.city' }),
      expect.objectContaining({ name: 'timestamp' }),
    ]);

    expect(result.length).toBe(14);
    expect(result).toEqual(expected);
  });

  it('should skip array sub-properties when skipArraySubProperties is true', async () => {
    const bundledSchema = JSON.parse(JSON.stringify(complexEventSchema));
    bundledSchema.properties.user_data.properties.addresses.items =
      addressSchema;
    RefParser.bundle.mockResolvedValue(bundledSchema);

    const result = await gtmScript.getVariablesFromSchemas(SCHEMA_PATH, {
      skipArraySubProperties: true,
    });

    const expected = [
      '$schema',
      'event',
      'user_data',
      'user_data.user_id',
      'user_data.addresses',
      'timestamp',
    ];

    expect(result.map((r) => r.name)).toEqual(expect.arrayContaining(expected));
    expect(result.length).toBe(12);
  });

  it('should include variables from oneOf choices and conditional branches', async () => {
    const bundledSchema = JSON.parse(JSON.stringify(complexEventSchema));
    bundledSchema.properties.user_data.properties.addresses.items =
      addressSchema;
    RefParser.bundle.mockResolvedValue(bundledSchema);

    const result = await gtmScript.getVariablesFromSchemas(SCHEMA_PATH, {});
    const variableNames = result.map((variable) => variable.name);

    expect(variableNames).toEqual(
      expect.arrayContaining([
        'contact_method.email',
        'contact_method.phone_number',
        'att_status',
        'ad_personalization_enabled',
      ]),
    );
  });

  it('should only include schemas explicitly targeted to web-datalayer-js', async () => {
    const untaggedEventPath = path.join(SCHEMA_PATH, 'legacy-event.json');
    mockFiles[SCHEMA_PATH].push('legacy-event.json');
    mockFileContents[untaggedEventPath] = JSON.stringify(untaggedEventSchema);

    const bundledWebSchema = JSON.parse(JSON.stringify(complexEventSchema));
    bundledWebSchema.properties.user_data.properties.addresses.items =
      addressSchema;

    RefParser.bundle.mockImplementation(async (filePath) => {
      if (filePath.endsWith('complex-event.json')) {
        return bundledWebSchema;
      }
      if (filePath.endsWith('mobile-event.json')) {
        return mobileEventSchema;
      }
      if (filePath.endsWith('legacy-event.json')) {
        return untaggedEventSchema;
      }
      if (filePath.endsWith('address.json')) {
        return addressSchema;
      }
      throw new Error(`Unexpected schema file: ${filePath}`);
    });

    const result = await gtmScript.getVariablesFromSchemas(SCHEMA_PATH, {});

    expect(result.map((variable) => variable.name)).toEqual(
      expect.arrayContaining([
        '$schema',
        'event',
        'user_data',
        'user_data.user_id',
        'user_data.addresses',
        'user_data.addresses.0.street',
        'user_data.addresses.0.city',
        'timestamp',
      ]),
    );
    expect(result.map((variable) => variable.name)).not.toContain(
      'screen_name',
    );
    expect(result.map((variable) => variable.name)).not.toContain(
      'legacy_field',
    );
  });

  it('should include root tracking schemas based on content instead of path names', async () => {
    const nestedSchemaDir = path.join(SCHEMA_PATH, 'event-components-demo');
    const nestedSchemaPath = path.join(nestedSchemaDir, 'checkout-event.json');
    const nestedSchema = {
      title: 'Checkout Event',
      'x-tracking-targets': ['web-datalayer-js'],
      type: 'object',
      properties: {
        event: { type: 'string', const: 'checkout' },
        order_id: { type: 'string', description: 'Order identifier.' },
      },
    };

    mockFiles[SCHEMA_PATH].push('event-components-demo');
    mockFiles[nestedSchemaDir] = ['checkout-event.json'];
    mockFileContents[nestedSchemaPath] = JSON.stringify(nestedSchema);

    const bundledWebSchema = JSON.parse(JSON.stringify(complexEventSchema));
    bundledWebSchema.properties.user_data.properties.addresses.items =
      addressSchema;

    RefParser.bundle.mockImplementation(async (filePath) => {
      if (filePath.endsWith('complex-event.json')) {
        return bundledWebSchema;
      }
      if (filePath.endsWith('mobile-event.json')) {
        return mobileEventSchema;
      }
      if (filePath.endsWith('address.json')) {
        return addressSchema;
      }
      if (filePath.endsWith('legacy-event.json')) {
        return untaggedEventSchema;
      }
      if (filePath.endsWith('checkout-event.json')) {
        return nestedSchema;
      }
      throw new Error(`Unexpected schema file: ${filePath}`);
    });

    const result = await gtmScript.getVariablesFromSchemas(SCHEMA_PATH, {});
    const variableNames = result.map((variable) => variable.name);

    expect(variableNames).toContain('order_id');
    expect(RefParser.bundle).toHaveBeenCalledWith(nestedSchemaPath);
  });

  it('should ignore component schemas even when scanning all json files', async () => {
    const bundledWebSchema = JSON.parse(JSON.stringify(complexEventSchema));
    bundledWebSchema.properties.user_data.properties.addresses.items =
      addressSchema;
    const nestedSchema = {
      title: 'Checkout Event',
      'x-tracking-targets': ['web-datalayer-js'],
      type: 'object',
      properties: {
        event: { type: 'string', const: 'checkout' },
        order_id: { type: 'string', description: 'Order identifier.' },
      },
    };

    RefParser.bundle.mockImplementation(async (filePath) => {
      if (filePath.endsWith('complex-event.json')) {
        return bundledWebSchema;
      }
      if (filePath.endsWith('mobile-event.json')) {
        return mobileEventSchema;
      }
      if (filePath.endsWith('address.json')) {
        return addressSchema;
      }
      if (filePath.endsWith('legacy-event.json')) {
        return untaggedEventSchema;
      }
      if (filePath.endsWith('checkout-event.json')) {
        return nestedSchema;
      }
      throw new Error(`Unexpected schema file: ${filePath}`);
    });

    const result = await gtmScript.getVariablesFromSchemas(SCHEMA_PATH, {});
    const variableNames = result.map((variable) => variable.name);

    expect(RefParser.bundle).toHaveBeenCalledWith(
      path.join(SCHEMA_PATH, 'components', 'address.json'),
    );
    expect(variableNames).not.toContain('street');
    expect(variableNames).not.toContain('city');
  });
});

describe('GTM Synchronization Logic', () => {
  const schemaVariables = [
    { name: '$schema', description: 'The schema version.' },
    { name: 'event', description: 'The event name.' },
    { name: 'user_id', description: 'The user ID.' },
  ];
  const gtmVariables = [
    {
      name: 'DLV - event',
      variableId: '1',
      type: 'v',
      parameter: [{ key: 'name', value: 'event' }],
    },
    {
      name: 'DLV - old_variable',
      variableId: '123',
      type: 'v',
      parameter: [{ key: 'name', value: 'old_variable' }],
    },
  ];
  const gtmTags = [
    {
      tagId: '42',
      name: 'GA4 Event',
      type: 'html',
      parameter: [
        {
          type: 'template',
          key: 'eventAction',
          value: '{{DLV - old_variable}}',
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReferencedVariableNames', () => {
    it('should extract referenced variable names from GTM entity parameters', () => {
      const referencedNames = gtmScript.getReferencedVariableNames(gtmTags, []);

      expect(referencedNames).toEqual(new Set(['DLV - old_variable']));
    });
  });

  describe('getVariableReferences', () => {
    it('should capture reference details by variable name', () => {
      const references = gtmScript.getVariableReferences(gtmTags, []);

      expect(references.get('DLV - old_variable')).toEqual([
        { type: 'tag', id: '42', name: 'GA4 Event' },
      ]);
    });
  });

  describe('stripVariableReferenceFromEntity', () => {
    it('should remove matching template references from entity parameters', () => {
      const tag = {
        tagId: '42',
        name: 'GA4 Event',
        parameter: [
          {
            type: 'template',
            key: 'eventAction',
            value: 'prefix {{DLV - old_variable}} suffix',
          },
          {
            type: 'list',
            key: 'items',
            list: [
              {
                type: 'template',
                key: 'nestedValue',
                value: '{{DLV - old_variable}}',
              },
            ],
          },
        ],
      };

      const updatedTag = gtmScript.stripVariableReferenceFromEntity(
        tag,
        'DLV - old_variable',
      );

      expect(updatedTag).toEqual({
        tagId: '42',
        name: 'GA4 Event',
        parameter: [
          {
            type: 'template',
            key: 'eventAction',
            value: 'prefix  suffix',
          },
          {
            type: 'list',
            key: 'items',
            list: [
              {
                type: 'template',
                key: 'nestedValue',
                value: ' ',
              },
            ],
          },
        ],
      });
    });
  });

  describe('getVariablesToCreate', () => {
    it('should return variables that are in schema but not in GTM', () => {
      const toCreate = gtmScript.getVariablesToCreate(
        schemaVariables,
        gtmVariables,
      );
      expect(toCreate).toEqual([
        { name: '$schema', description: 'The schema version.' },
        { name: 'user_id', description: 'The user ID.' },
      ]);
    });
  });

  describe('getVariablesToDelete', () => {
    it('should return variables that are in GTM but not in schema', () => {
      const toDelete = gtmScript.getVariablesToDelete(
        schemaVariables,
        gtmVariables,
      );
      expect(toDelete).toEqual([
        {
          name: 'DLV - old_variable',
          variableId: '123',
          type: 'v',
          parameter: [{ key: 'name', value: 'old_variable' }],
        },
      ]);
    });

    it('should skip stale variables that are still referenced', () => {
      const referencedNames = new Set(['DLV - old_variable']);

      const toDelete = gtmScript.getVariablesToDelete(
        schemaVariables,
        gtmVariables,
        referencedNames,
      );

      expect(toDelete).toEqual([]);
    });
  });

  describe('createGtmVariables', () => {
    it('should call execSync to create variables and return their names', () => {
      const toCreate = gtmScript.getVariablesToCreate(
        schemaVariables,
        gtmVariables,
      );
      const created = gtmScript.createGtmVariables(toCreate);
      expect(execSync).toHaveBeenCalledTimes(2);

      const schemaVarConfig = JSON.stringify({
        notes: "References the '$schema' property. The schema version.",
        parameter: [
          { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
          { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
          { type: 'TEMPLATE', key: 'name', value: '$schema' },
        ],
      });
      expect(execSync).toHaveBeenCalledWith(
        `gtm variables create --name "DLV - \\$schema" --type v --config '${schemaVarConfig}' --quiet`,
        { stdio: 'inherit' },
      );

      const userIdVarConfig = JSON.stringify({
        notes: 'The user ID.',
        parameter: [
          { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
          { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
          { type: 'TEMPLATE', key: 'name', value: 'user_id' },
        ],
      });
      expect(execSync).toHaveBeenCalledWith(
        `gtm variables create --name "DLV - user_id" --type v --config '${userIdVarConfig}' --quiet`,
        { stdio: 'inherit' },
      );
      expect(created).toEqual(['$schema', 'user_id']);
    });
  });

  describe('deleteGtmVariables', () => {
    it('should call execSync to delete variables and return their names', () => {
      const toDelete = gtmScript.getVariablesToDelete(
        schemaVariables,
        gtmVariables,
      );
      const deleted = gtmScript.deleteGtmVariables(toDelete);
      expect(execSync).toHaveBeenCalledTimes(1);
      expect(execSync).toHaveBeenCalledWith(
        'gtm variables delete --variable-id 123 --force --quiet',
        { stdio: 'inherit' },
      );
      expect(deleted).toEqual(['old_variable']);
    });
  });

  describe('syncGtmVariables', () => {
    it('should report blocked deletions for referenced stale variables', async () => {
      const syncedSchemaVariables = [
        { name: 'event', description: 'The event name.' },
      ];

      execSync.mockImplementation((command) => {
        if (command === 'gtm variables list -o json --quiet') {
          return Buffer.from(JSON.stringify(gtmVariables));
        }
        if (command === 'gtm tags list -o json --quiet') {
          return Buffer.from(JSON.stringify(gtmTags));
        }
        if (command === 'gtm triggers list -o json --quiet') {
          return Buffer.from('[]');
        }
        throw new Error(`Unexpected command: ${command}`);
      });

      const summary = await gtmScript.syncGtmVariables(syncedSchemaVariables);

      expect(summary.deleted).toEqual([]);
      expect(summary.blockedDeletes).toEqual([
        {
          name: 'old_variable',
          variableId: '123',
          references: [{ type: 'tag', id: '42', name: 'GA4 Event' }],
        },
      ]);
    });

    it('should remove references and delete stale variables when removeReferences is enabled', async () => {
      const syncedSchemaVariables = [
        { name: 'event', description: 'The event name.' },
      ];

      execSync.mockImplementation((command) => {
        if (command === 'gtm variables list -o json --quiet') {
          return Buffer.from(JSON.stringify(gtmVariables));
        }
        if (command === 'gtm tags list -o json --quiet') {
          return Buffer.from(JSON.stringify(gtmTags));
        }
        if (command === 'gtm triggers list -o json --quiet') {
          return Buffer.from('[]');
        }
        return Buffer.from('');
      });

      const summary = await gtmScript.syncGtmVariables(syncedSchemaVariables, {
        removeReferences: true,
      });

      expect(execSync).toHaveBeenCalledWith(
        `gtm tags update --tag-id 42 --name "GA4 Event" --config '${JSON.stringify(
          {
            type: 'html',
            parameter: [
              {
                type: 'template',
                key: 'eventAction',
                value: ' ',
              },
            ],
          },
        )}' --quiet`,
        { stdio: 'inherit' },
      );
      expect(execSync).toHaveBeenCalledWith(
        'gtm variables delete --variable-id 123 --force --quiet',
        { stdio: 'inherit' },
      );
      expect(summary.deleted).toEqual(['old_variable']);
      expect(summary.blockedDeletes).toEqual([]);
      expect(summary.removedReferences).toEqual([
        {
          variableName: 'old_variable',
          referenceCount: 1,
          entities: [{ type: 'tag', id: '42', name: 'GA4 Event' }],
        },
      ]);
    });
  });
});

describe('main function', () => {
  let mockDeps;
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    fs.existsSync.mockReturnValue(true);
    mockDeps = {
      setupGtmWorkspace: jest.fn().mockResolvedValue({
        workspaceName: 'test-workspace',
        workspaceId: '123',
      }),
      syncGtmVariables: jest.fn().mockResolvedValue({
        created: ['var1'],
        deleted: ['var2'],
        removedReferences: [
          {
            variableName: 'legacy_field',
            referenceCount: 1,
            entities: [{ type: 'tag', id: '42', name: 'GA4 Event' }],
          },
        ],
        blockedDeletes: [
          {
            name: 'legacy_field',
            variableId: '88',
            references: [{ type: 'tag', id: '42', name: 'GA4 Event' }],
          },
        ],
        inSync: ['var3'],
      }),
      getVariablesFromSchemas: jest
        .fn()
        .mockResolvedValue([{ name: 'event', description: 'Event name' }]),
      getLatestSchemaPath: jest.fn().mockReturnValue('/fake/schemas'),
      assertGtmCliAvailable: jest.fn(),
      logger: gtmScript.logger,
      parseArgs: gtmScript.parseArgs,
      process: {
        exit: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should run quietly when --quiet is passed', async () => {
    const argv = ['node', 'script.js', '--quiet'];
    await gtmScript.main(argv, mockDeps);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('should output JSON when --json is passed', async () => {
    const argv = ['node', 'script.js', '--json'];
    await gtmScript.main(argv, mockDeps);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logSpy.mock.calls[0][0])).toEqual({
      workspace: { workspaceName: 'test-workspace', workspaceId: '123' },
      created: ['var1'],
      deleted: ['var2'],
      removedReferences: [
        {
          variableName: 'legacy_field',
          referenceCount: 1,
          entities: [{ type: 'tag', id: '42', name: 'GA4 Event' }],
        },
      ],
      blockedDeletes: [
        {
          name: 'legacy_field',
          variableId: '88',
          references: [{ type: 'tag', id: '42', name: 'GA4 Event' }],
        },
      ],
      inSync: ['var3'],
    });
  });

  it('should use the path from --path argument', async () => {
    const argv = ['node', 'script.js', '--path=./my-demo'];
    await gtmScript.main(argv, mockDeps);
    expect(mockDeps.getLatestSchemaPath).toHaveBeenCalledWith('./my-demo');
  });

  it('should report blocked deletions in human-readable output', async () => {
    const argv = ['node', 'script.js'];
    await gtmScript.main(argv, mockDeps);

    expect(logSpy).toHaveBeenCalledWith(
      'Removed 1 referenced variable usages before deletion:',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '- legacy_field from tag "GA4 Event" (42)',
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Skipped deleting 1 GTM variables because they are still referenced:',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '- legacy_field (ID: 88) referenced by tag "GA4 Event" (42)',
    );
  });
});

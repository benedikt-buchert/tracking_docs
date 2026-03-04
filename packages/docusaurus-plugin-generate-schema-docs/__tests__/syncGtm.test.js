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
  it('should parse --quiet, --json, and --skip-array-sub-properties flags', () => {
    const argv = [
      'node',
      'script.js',
      '--quiet',
      '--json',
      '--skip-array-sub-properties',
    ];
    const { isQuiet, isJson, skipArraySubProperties } =
      gtmScript.parseArgs(argv);
    expect(isQuiet).toBe(true);
    expect(isJson).toBe(true);
    expect(skipArraySubProperties).toBe(true);
  });

  it('should parse --path argument', () => {
    const argv = ['node', 'script.js', '--path=./my-demo'];
    const { siteDir } = gtmScript.parseArgs(argv);
    expect(siteDir).toBe('./my-demo');
  });

  it('should default siteDir to ./demo', () => {
    const argv = ['node', 'script.js'];
    const { siteDir } = gtmScript.parseArgs(argv);
    expect(siteDir).toBe('./demo');
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
    [SCHEMA_PATH]: ['complex-event.json', 'components'],
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
      timestamp: { type: 'number', description: 'Event timestamp.' },
    },
  };
  const mockFileContents = {
    [path.join(SCHEMA_PATH, 'complex-event.json')]:
      JSON.stringify(complexEventSchema),
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

    expect(result.length).toBe(8);
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
    expect(result.length).toBe(expected.length);
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

  beforeEach(() => {
    jest.clearAllMocks();
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
});

describe('main function', () => {
  let mockDeps;
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockDeps = {
      setupGtmWorkspace: jest.fn().mockResolvedValue({
        workspaceName: 'test-workspace',
        workspaceId: '123',
      }),
      syncGtmVariables: jest.fn().mockResolvedValue({
        created: ['var1'],
        deleted: ['var2'],
        inSync: ['var3'],
      }),
      getVariablesFromSchemas: jest.fn().mockResolvedValue([]),
      getLatestSchemaPath: jest.fn().mockReturnValue('/fake/schemas'),
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
      inSync: ['var3'],
    });
  });

  it('should use the path from --path argument', async () => {
    const argv = ['node', 'script.js', '--path=./my-demo'];
    await gtmScript.main(argv, mockDeps);
    expect(mockDeps.getLatestSchemaPath).toHaveBeenCalledWith('./my-demo');
  });
});

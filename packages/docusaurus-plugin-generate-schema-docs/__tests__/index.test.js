/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

import createPlugin from '../index.js';

jest.mock('url', () => ({
  fileURLToPath: jest.fn(
    () => '/mocked/packages/docusaurus-plugin-generate-schema-docs/index.js',
  ),
  pathToFileURL: jest.fn((p) => ({ href: 'file://' + p })),
}));

jest.mock('../generateEventDocs.js', () => jest.fn().mockResolvedValue());
jest.mock('../validateSchemas.js', () => jest.fn().mockResolvedValue(true));
jest.mock('../helpers/update-schema-ids.js', () => jest.fn());
jest.mock('../helpers/path-helpers.js', () => ({
  getPathsForVersion: jest
    .fn()
    .mockReturnValue({ schemaDir: '/site/static/schemas/next' }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  cpSync: jest.fn(),
}));

import generateEventDocs from '../generateEventDocs.js';
import validateSchemas from '../validateSchemas.js';
import fs from 'fs';

const makeContext = (overrides = {}) => ({
  siteDir: '/site',
  siteConfig: {
    organizationName: 'org',
    projectName: 'proj',
    url: 'https://example.com',
  },
  ...overrides,
});

const makeOptions = () => ({ dataLayerName: 'dataLayer' });

beforeEach(() => {
  jest.clearAllMocks();
  fs.existsSync.mockReturnValue(false);
});

describe('loadContent', () => {
  it('calls generateEventDocs once without version when not versioned', async () => {
    const plugin = await createPlugin(makeContext(), makeOptions());
    await plugin.loadContent();

    expect(generateEventDocs).toHaveBeenCalledTimes(1);
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.not.objectContaining({ version: expect.anything() }),
    );
  });

  it('calls generateEventDocs for each version plus current when versioned', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(['1.0', '2.0']));

    const plugin = await createPlugin(makeContext(), makeOptions());
    await plugin.loadContent();

    expect(generateEventDocs).toHaveBeenCalledTimes(3);
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.0' }),
    );
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: '2.0' }),
    );
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'current' }),
    );
  });
});

describe('extendCli - validate-schemas', () => {
  const makeCli = (targetCommand = 'validate-schemas [version]') => {
    const action = { fn: null };
    const cli = {
      command: jest.fn((name) => {
        const cmd = {
          description: jest.fn().mockReturnThis(),
          option: jest.fn().mockReturnThis(),
          action: jest.fn((fn) => {
            if (name === targetCommand) action.fn = fn;
            return cmd;
          }),
        };
        return cmd;
      }),
    };
    return { cli, action };
  };

  it('calls validateSchemas with schemaDir for given version', async () => {
    const { cli, action } = makeCli();
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);

    // first command registered is validate-schemas
    expect(cli.command).toHaveBeenCalledWith('validate-schemas [version]');
    await action.fn('next');

    expect(validateSchemas).toHaveBeenCalledWith('/site/static/schemas/next');
  });

  it('defaults to "next" version when no version argument given', async () => {
    const { cli, action } = makeCli();
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);

    await action.fn(undefined);
    expect(validateSchemas).toHaveBeenCalledWith('/site/static/schemas/next');
  });

  it('exits with code 1 when validation fails', async () => {
    validateSchemas.mockResolvedValue(false);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { cli, action } = makeCli();
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);

    await action.fn('next');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});

describe('plugin structure', () => {
  it('returns plugin with name docusaurus-plugin-generate-schema-docs', async () => {
    const plugin = await createPlugin(makeContext(), makeOptions());
    expect(plugin.name).toBe('docusaurus-plugin-generate-schema-docs');
  });

  it('passes all pluginOptions properties to generateEventDocs', async () => {
    const plugin = await createPlugin(makeContext(), makeOptions());
    await plugin.loadContent();

    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: 'org',
        projectName: 'proj',
        siteDir: '/site',
        url: 'https://example.com',
        dataLayerName: 'dataLayer',
      }),
    );
  });

  it('checks for versions.json inside siteDir', async () => {
    await createPlugin(makeContext(), makeOptions());
    expect(fs.existsSync).toHaveBeenCalledWith('/site/versions.json');
  });

  it('getPathsToWatch returns static/schemas/next path when versioned', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(['1.0']));

    const plugin = await createPlugin(makeContext(), makeOptions());
    const paths = plugin.getPathsToWatch();
    expect(paths).toContain('/site/static/schemas/next');
  });

  it('getPathsToWatch returns static/schemas path when not versioned', async () => {
    const plugin = await createPlugin(makeContext(), makeOptions());
    const paths = plugin.getPathsToWatch();
    expect(paths).toContain('/site/static/schemas');
    expect(paths).not.toContain('/site/static/schemas/next');
  });

  it('has a getThemePath method', async () => {
    const plugin = await createPlugin(makeContext(), makeOptions());
    expect(typeof plugin.getThemePath).toBe('function');
  });
});

describe('extendCli - generate-schema-docs', () => {
  const getActionForCommand = async (commandName) => {
    let capturedAction = null;
    const cli = {
      command: jest.fn((name) => {
        const cmd = {
          description: jest.fn().mockReturnThis(),
          option: jest.fn().mockReturnThis(),
          action: jest.fn((fn) => {
            if (name === commandName) capturedAction = fn;
            return cmd;
          }),
        };

        return cmd;
      }),
    };
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);
    return capturedAction;
  };

  it('calls generateEventDocs once when not versioned', async () => {
    const action = await getActionForCommand('generate-schema-docs');
    await action();
    expect(generateEventDocs).toHaveBeenCalledTimes(1);
  });

  it('calls generateEventDocs for each version plus current when versioned', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(['1.0']));

    const action = await getActionForCommand('generate-schema-docs');
    await action();

    expect(generateEventDocs).toHaveBeenCalledTimes(2);
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.0' }),
    );
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'current' }),
    );
  });
});

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
jest.mock('child_process', () => ({ execSync: jest.fn() }));
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
import updateSchemaIds from '../helpers/update-schema-ids.js';
import { getPathsForVersion } from '../helpers/path-helpers.js';
import fs from 'fs';
import { execSync } from 'child_process';

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

    expect(fs.readFileSync).toHaveBeenCalledWith('/site/versions.json', 'utf8');
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
    expect(getPathsForVersion).toHaveBeenCalledWith('next', '/site');
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

  it('has a getThemePath method that returns ./components', async () => {
    const plugin = await createPlugin(makeContext(), makeOptions());
    expect(typeof plugin.getThemePath).toBe('function');
    expect(plugin.getThemePath()).toBe('./components');
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

    expect(fs.readFileSync).toHaveBeenCalledWith('/site/versions.json', 'utf8');
    expect(generateEventDocs).toHaveBeenCalledTimes(2);
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.0' }),
    );
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'current' }),
    );
  });
});

describe('extendCli - update-schema-ids', () => {
  const getAction = async () => {
    let captured = null;
    const cli = {
      command: jest.fn((name) => {
        const cmd = {
          description: jest.fn().mockReturnThis(),
          option: jest.fn().mockReturnThis(),
          action: jest.fn((fn) => {
            if (name === 'update-schema-ids [version]') captured = fn;
            return cmd;
          }),
        };
        return cmd;
      }),
    };
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);
    return captured;
  };

  it('calls updateSchemaIds with siteDir, url, and version', async () => {
    const action = await getAction();
    action('1.0.0');
    expect(updateSchemaIds).toHaveBeenCalledWith(
      '/site',
      'https://example.com',
      '1.0.0',
    );
  });
});

describe('extendCli - sync-gtm', () => {
  const getAction = async () => {
    let captured = null;
    const cli = {
      command: jest.fn((name) => {
        const cmd = {
          description: jest.fn().mockReturnThis(),
          option: jest.fn().mockReturnThis(),
          action: jest.fn((fn) => {
            if (name === 'sync-gtm') captured = fn;
            return cmd;
          }),
        };
        return cmd;
      }),
    };
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);
    return captured;
  };

  it('runs the sync-gtm script with the default path', async () => {
    const action = await getAction();
    action({ path: '/site' });
    const cmd = execSync.mock.calls[0][0];
    expect(cmd).toContain('scripts/sync-gtm.js');
    expect(cmd).toContain('--path=/site');
    expect(execSync).toHaveBeenCalledWith(cmd, {
      cwd: '/site',
      stdio: 'inherit',
    });
  });

  it('joins multiple args with spaces', async () => {
    const action = await getAction();
    action({ path: '/site', json: true, quiet: true });
    const cmd = execSync.mock.calls[0][0];
    expect(cmd).toContain('--path=/site --json --quiet');
  });

  it('appends --json flag when json option is set', async () => {
    const action = await getAction();
    action({ path: '/site', json: true });
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('--json'),
      expect.any(Object),
    );
  });

  it('appends --quiet flag when quiet option is set', async () => {
    const action = await getAction();
    action({ path: '/site', quiet: true });
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('--quiet'),
      expect.any(Object),
    );
  });

  it('appends --skip-array-sub-properties flag when option is set', async () => {
    const action = await getAction();
    action({ path: '/site', skipArraySubProperties: true });
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('--skip-array-sub-properties'),
      expect.any(Object),
    );
  });

  it('does not append optional flags when options are falsy', async () => {
    const action = await getAction();
    action({ path: '/site' });
    const cmd = execSync.mock.calls[0][0];
    expect(cmd).not.toContain('--json');
    expect(cmd).not.toContain('--quiet');
    expect(cmd).not.toContain('--skip-array-sub-properties');
  });
});

describe('extendCli - version-with-schemas', () => {
  const getAction = async () => {
    let captured = null;
    const cli = {
      command: jest.fn((name) => {
        const cmd = {
          description: jest.fn().mockReturnThis(),
          option: jest.fn().mockReturnThis(),
          action: jest.fn((fn) => {
            if (name === 'version-with-schemas <version>') captured = fn;
            return cmd;
          }),
        };
        return cmd;
      }),
    };
    const plugin = await createPlugin(makeContext(), makeOptions());
    plugin.extendCli(cli);
    return captured;
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // versions.json absent (not versioned); nextSchemasDir present
    fs.existsSync.mockImplementation((p) => !p.includes('versions.json'));
  });

  it('creates version, copies schemas, updates IDs and generates docs on success', async () => {
    const action = await getAction();
    await action('1.2.0');

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('docs:version 1.2.0'),
      { cwd: '/site', stdio: 'inherit' },
    );
    expect(fs.cpSync).toHaveBeenCalledWith(
      '/site/static/schemas/next',
      '/site/static/schemas/1.2.0',
      { recursive: true },
    );
    expect(updateSchemaIds).toHaveBeenCalledWith(
      '/site',
      'https://example.com',
      '1.2.0',
    );
    expect(generateEventDocs).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.2.0' }),
    );
  });

  it('exits with code 1 when docusaurus docs:version fails', async () => {
    execSync.mockImplementation(() => {
      throw new Error('cmd failed');
    });
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    const action = await getAction();
    await action('1.2.0');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('exits with code 1 when next schemas directory does not exist', async () => {
    execSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(false); // nextSchemasDir also missing
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    const action = await getAction();
    await action('1.2.0');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('exits with code 1 when schema copy fails', async () => {
    execSync.mockImplementation(() => {});
    fs.cpSync.mockImplementation(() => {
      throw new Error('copy failed');
    });
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    const action = await getAction();
    await action('1.2.0');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

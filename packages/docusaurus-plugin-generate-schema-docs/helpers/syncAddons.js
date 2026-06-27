import path from 'path';
import { execSync } from 'child_process';

function normalizeSyncAddon(addon) {
  if (!addon?.id || typeof addon.id !== 'string') {
    throw new Error('Sync addon must define a string id.');
  }
  if (!addon.command || typeof addon.command !== 'string') {
    throw new Error(`Sync addon "${addon.id}" must define a command.`);
  }
  if (!addon.description || typeof addon.description !== 'string') {
    throw new Error(`Sync addon "${addon.id}" must define a description.`);
  }
  if (!Array.isArray(addon.targetIds)) {
    throw new Error(`Sync addon "${addon.id}" must define targetIds.`);
  }
  if (typeof addon.collect !== 'function') {
    throw new Error(`Sync addon "${addon.id}" must define collect.`);
  }
  if (typeof addon.apply !== 'function') {
    throw new Error(`Sync addon "${addon.id}" must define apply.`);
  }

  return addon;
}

export function createSyncAddonRegistry({
  builtInAddons = [],
  customAddons = [],
} = {}) {
  const addonIds = new Set();
  const addons = [...builtInAddons, ...customAddons].map(normalizeSyncAddon);

  addons.forEach((addon) => {
    if (addonIds.has(addon.id)) {
      throw new Error(`Duplicate sync addon id: ${addon.id}`);
    }
    addonIds.add(addon.id);
  });

  return addons;
}

export function createGtmDataLayerSyncAddon({ addon, pluginDir, siteDir }) {
  return {
    ...addon,
    options: [
      [
        '--path <siteDir>',
        'Docusaurus site directory containing static/schemas',
        siteDir,
      ],
      ['--json', 'Output JSON summary'],
      ['--quiet', 'Suppress non-error logs'],
      [
        '--skip-array-sub-properties',
        'Skip array item sub-properties (e.g., list.0.item)',
      ],
    ],
    collect({ commandOptions = {} }) {
      return commandOptions;
    },
    apply({ desiredState: commandOptions = {} }) {
      const scriptPath = path.join(pluginDir, 'scripts', 'sync-gtm.js');
      const args = [`--path=${commandOptions.path}`];

      if (commandOptions.json) args.push('--json');
      if (commandOptions.quiet) args.push('--quiet');
      if (commandOptions.skipArraySubProperties) {
        args.push('--skip-array-sub-properties');
      }

      execSync(`node "${scriptPath}" ${args.join(' ')}`, {
        cwd: siteDir,
        stdio: 'inherit',
      });
    },
  };
}

function addCommandOptions(command, options = []) {
  options.forEach((option) => {
    command.option(...option);
  });
}

export function registerSyncAddonCommands(
  cli,
  syncAddonRegistry,
  { siteDir, logger = console },
) {
  syncAddonRegistry.forEach((addon) => {
    const command = cli.command(addon.command).description(addon.description);
    addCommandOptions(command, addon.options);
    command.action((commandOptions = {}) => {
      const collectInput = {
        siteDir,
        commandOptions,
        logger,
      };
      const applyInput = (desiredState) => ({
        desiredState,
        config: { siteDir, commandOptions },
        logger,
      });

      const desiredState = addon.collect(collectInput);
      if (desiredState && typeof desiredState.then === 'function') {
        return desiredState.then((resolvedDesiredState) =>
          addon.apply(applyInput(resolvedDesiredState)),
        );
      }

      return addon.apply(applyInput(desiredState));
    });
  });
}

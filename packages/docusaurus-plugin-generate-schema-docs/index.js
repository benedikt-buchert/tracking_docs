import { getPathsForVersion } from './helpers/path-helpers.js';
import updateSchemaIds from './helpers/update-schema-ids.js';
import fs from 'fs';
import validateSchemas from './validateSchemas.js';
import generateEventDocs from './generateEventDocs.js';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function (context, options) {
  const { siteDir } = context;
  const { dataLayerName } = options;
  const { organizationName, projectName, url } = context.siteConfig;

  const pluginOptions = {
    organizationName,
    projectName,
    siteDir,
    url,
    dataLayerName,
  };
  const versionsJsonPath = path.join(siteDir, 'versions.json');
  const isVersioned = fs.existsSync(versionsJsonPath);

  const extendCli = (cli) => {
    cli
      .command('validate-schemas [version]')
      .description('Validate JSON Schemas with the examples inside the schemas')
      .action(async (version) => {
        console.log('Validating GTM Schemas...');
        const schemaVersion = version || 'next';
        const { schemaDir } = getPathsForVersion(
          schemaVersion,
          context.siteDir,
        );
        const success = await validateSchemas(schemaDir);
        if (!success) {
          console.error('Validation failed.');
          process.exit(1);
        }
        console.log('✅ All schemas and examples are valid!');
      });

    cli
      .command('generate-schema-docs')
      .description('Generate schema documentation from JSON schemas')
      .action(async () => {
        if (isVersioned) {
          const versions = JSON.parse(
            fs.readFileSync(versionsJsonPath, 'utf8'),
          );
          for (const version of versions) {
            // FIX 3: Removed 'newOptions' and used the consolidated pluginOptions
            await generateEventDocs({ ...pluginOptions, version });
          }
          await generateEventDocs({ ...pluginOptions, version: 'current' });
        } else {
          await generateEventDocs(pluginOptions);
        }
      });

    cli
      .command('update-schema-ids [version]')
      .description('Update the $id of the versioned schemas')
      .action((version) => {
        updateSchemaIds(siteDir, url, version);
      });

    cli
      .command('sync-gtm')
      .description('Synchronize GTM Data Layer Variables from JSON schemas')
      .option(
        '--path <siteDir>',
        'Docusaurus site directory that contains static/schemas',
        siteDir,
      )
      .option('--json', 'Output JSON summary')
      .option('--quiet', 'Suppress non-error logs')
      .option(
        '--skip-array-sub-properties',
        'Skip array item sub-properties (e.g., list.0.item)',
      )
      .action((commandOptions) => {
        const scriptPath = path.join(__dirname, 'scripts', 'sync-gtm.js');
        const args = [`--path=${commandOptions.path}`];

        if (commandOptions.json) args.push('--json');
        if (commandOptions.quiet) args.push('--quiet');
        if (commandOptions.skipArraySubProperties)
          args.push('--skip-array-sub-properties');

        execSync(`node "${scriptPath}" ${args.join(' ')}`, {
          cwd: siteDir,
          stdio: 'inherit',
        });
      });

    cli
      .command('version-with-schemas <version>')
      .description(
        'Create a new docs version and copy schemas from next to versioned folder',
      )
      .action(async (version) => {
        const { execSync } = await import('child_process');

        console.log(`📦 Creating docs version ${version}...`);
        try {
          // Run the standard docusaurus docs:version command
          execSync(`npx docusaurus docs:version ${version}`, {
            cwd: siteDir,
            stdio: 'inherit',
          });
        } catch (error) {
          console.error('❌ Failed to create docs version');
          process.exit(1);
        }

        console.log(`📂 Copying schemas from next to ${version}...`);
        const nextSchemasDir = path.join(siteDir, 'static/schemas/next');
        const versionedSchemasDir = path.join(
          siteDir,
          'static/schemas',
          version,
        );

        if (!fs.existsSync(nextSchemasDir)) {
          console.error(
            `❌ Source schemas directory not found: ${nextSchemasDir}`,
          );
          process.exit(1);
        }

        // Copy the schemas
        try {
          fs.cpSync(nextSchemasDir, versionedSchemasDir, { recursive: true });
          console.log(`✅ Schemas copied to ${versionedSchemasDir}`);
        } catch (error) {
          console.error(`❌ Failed to copy schemas: ${error.message}`);
          process.exit(1);
        }

        // Update schema IDs for the new version
        console.log(`🔄 Updating schema $ids for version ${version}...`);
        updateSchemaIds(siteDir, url, version);

        // Generate documentation for the new version
        console.log(`📝 Generating documentation for version ${version}...`);
        await generateEventDocs({ ...pluginOptions, version });

        console.log(`\n✅ Version ${version} created successfully!`);
        console.log(`\nNext steps:`);
        console.log(`  1. Review the changes in static/schemas/${version}/`);
        console.log(
          `  2. Review the changes in versioned_docs/version-${version}/`,
        );
        console.log(`  3. Commit the changes to version control`);
      });
  };

  const schemasPath = isVersioned
    ? path.join(siteDir, 'static/schemas/next')
    : path.join(siteDir, 'static/schemas');

  return {
    name: 'docusaurus-plugin-generate-schema-docs',

    getPathsToWatch() {
      return [schemasPath];
    },

    async loadContent() {
      if (isVersioned) {
        const versions = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
        for (const version of versions) {
          await generateEventDocs({ ...pluginOptions, version });
        }
        await generateEventDocs({ ...pluginOptions, version: 'current' });
      } else {
        await generateEventDocs(pluginOptions);
      }
    },

    getThemePath() {
      return './components';
    },

    extendCli,
  };
}

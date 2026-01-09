import updateSchemaIds from './helpers/update-schema-ids.js';
import fs from 'fs';
import validateSchemas from './validateSchemas.js';
import generateEventDocs from './generateEventDocs.js';
import path from 'path';

export default async function (context) {
    const { siteDir } = context;
    const { organizationName, projectName, url } = context.siteConfig;
    const options = { organizationName, projectName, siteDir, url };
    const versionsJsonPath = path.join(siteDir, 'versions.json');

    const extendCli = (cli) => {
        cli
            .command('validate-schemas [version]')
            .description('Validate JSON Schemas with the examples inside the schemas')
            .action(async (version) => {
                console.log('Validating GTM Schemas...');
                const schemaVersion = version || 'next';
                const schemaPath = path.join(context.siteDir, 'static/schemas', schemaVersion);
                const success = await validateSchemas(schemaPath);
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
                if (fs.existsSync(versionsJsonPath)) {
                    const versions = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
                    for (const version of versions) {
                        await generateEventDocs({ ...options, version });
                    }
                    await generateEventDocs({ ...options, version: 'current' });
                } else {
                    await generateEventDocs(options);
                }
            });

        cli
            .command('update-schema-ids [version]')
            .description('Update the $id of the versioned schemas')
            .action((version) => {
                updateSchemaIds(siteDir, url, version);
            });

        cli
            .command('version-with-schemas <version>')
            .description('Create a new docs version and copy schemas from next to versioned folder')
            .action(async (version) => {
                const { execSync } = await import('child_process');

                console.log(`📦 Creating docs version ${version}...`);
                try {
                    // Run the standard docusaurus docs:version command
                    execSync(`npx docusaurus docs:version ${version}`, {
                        cwd: siteDir,
                        stdio: 'inherit'
                    });
                } catch (error) {
                    console.error('❌ Failed to create docs version');
                    process.exit(1);
                }

                console.log(`📂 Copying schemas from next to ${version}...`);
                const nextSchemasDir = path.join(siteDir, 'static/schemas/next');
                const versionedSchemasDir = path.join(siteDir, 'static/schemas', version);

                if (!fs.existsSync(nextSchemasDir)) {
                    console.error(`❌ Source schemas directory not found: ${nextSchemasDir}`);
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
                await generateEventDocs({ ...options, version });

                console.log(`\n✅ Version ${version} created successfully!`);
                console.log(`\nNext steps:`);
                console.log(`  1. Review the changes in static/schemas/${version}/`);
                console.log(`  2. Review the changes in versioned_docs/version-${version}/`);
                console.log(`  3. Commit the changes to version control`);
            });
    };

    if (fs.existsSync(versionsJsonPath)) {
        // Versioned docs
        const versions = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
        const schemasPath = path.join(siteDir, 'static/schemas/next');

        return {
            name: 'docusaurus-plugin-generate-schema-docs',

            getPathsToWatch() {
                // Watch the schemas directory for changes
                return [schemasPath];
            },

            async loadContent() {
                // Generate event documentation for all versions
                for (const version of versions) {
                    await generateEventDocs({ ...options, version });
                }
                // Also generate for "current"
                await generateEventDocs({ ...options, version: 'current' });
            },

            getThemePath() {
                return './components';
            },

            extendCli,
        };
    } else {
        // Non-versioned docs
        const schemasPath = path.join(siteDir, 'static/schemas');

        return {
            name: 'docusaurus-plugin-generate-schema-docs',

            getPathsToWatch() {
                return [schemasPath];
            },

            async loadContent() {
                await generateEventDocs(options);
            },

            getThemePath() {
                return './components';
            },

            extendCli,
        };
    }
}

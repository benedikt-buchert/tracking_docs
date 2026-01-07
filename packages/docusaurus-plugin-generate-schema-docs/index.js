import fs from 'fs';
import validateSchemas from './validateSchemas.js';
import generateEventDocs from './generateEventDocs.js';
import path from 'path';

export default async function (context) {
    const { siteDir } = context;
    const { organizationName, projectName, url } = context.siteConfig;
    const options = { organizationName, projectName, siteDir, url };
    const versionsJsonPath = path.join(siteDir, 'versions.json');

    if (fs.existsSync(versionsJsonPath)) {
        // Versioned docs
        const versions = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
        const schemasPath = path.join(siteDir, 'static/schemas/next');

        // Generate docs for all versions on startup
        for (const version of versions) {
            await generateEventDocs({ ...options, version });
        }
        // Also generate for "current"
        await generateEventDocs({ ...options, version: 'current' });

        return {
            name: 'docusaurus-plugin-generate-schema-docs',

            getPathsToWatch() {
                // Watch the schemas directory for changes
                return [schemasPath];
            },

            async loadContent() {
                // Generate event documentation when watched files change
                await generateEventDocs({ ...options, version: 'current' });
            },

            getThemePath() {
                return './components';
            },

            extendCli(cli) {
                // ... (CLI commands are not version-aware for now)
            },
        };
    } else {
        // Non-versioned docs
        const schemasPath = path.join(siteDir, 'static/schemas');
        await generateEventDocs(options);

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

            extendCli(cli) {
                // ...
            },
        };
    }
}

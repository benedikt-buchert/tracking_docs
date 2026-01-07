import validateSchemas from './validateSchemas.js';
import generateEventDocs from './generateEventDocs.js';
import path from 'path';

export default async function (context) {
    const { siteDir } = context;
    const { organizationName, projectName } = context.siteConfig;
    const options = { organizationName, projectName, siteDir };
    const schemasPath = path.join(siteDir, 'static/schemas');

    // Generate docs on startup
    await generateEventDocs(options);

    return {
        name: 'docusaurus-plugin-generate-schema-docs',

        getPathsToWatch() {
            // Watch the schemas directory for changes
            return [schemasPath];
        },

        async loadContent() {
            // Generate event documentation when watched files change
            await generateEventDocs(options);
        },

        getThemePath() {
            return './components';
        },

        extendCli(cli) {
            cli
                .command('validate-schemas')
                .description('Validate JSON Schemas with the examples inside the schemas')
                .action(async () => {
                    console.log('Validating GTM Schemas...');
                    // You might get the path from 'options' or assume a default
                    const schemaPath = options?.path || path.join(context.siteDir, 'static/schemas');

                    const success = await validateSchemas(schemaPath);

                    if (!success)
                    {
                        console.error('Validation failed.');
                        process.exit(1); // Important for CI to fail!
                    }
                    console.log('✅ All schemas and examples are valid!');
                });

            cli
                .command('generate schema-docs')
                .description('Generate schema documentation from JSON schemas')
                .action(async () => {
                    // You can pass options here if generateEventDocs needs the path too
                    // e.g., await generateEventDocs(options.path || './static/schemas');
                    await generateEventDocs();
                });
        },
    };
}

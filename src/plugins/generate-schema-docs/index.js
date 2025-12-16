// src/index.ts
import validateSchemas from './validateSchemas.js';
import generateEventDocs from './generateEventDocs.js';
import path from 'path';

export default function (context, options) {
    return {
        // I've updated the name to reflect that it now handles multiple tasks
        name: 'docusaurus-plugin-schema-tools',

        extendCli(cli) {
            cli
                .command('validate-schemas')
                .description('Validate JSON Schemas with the examples inside the schemas')
                .action(async () => {
                    console.log('Validating GTM Schemas...');
                    // You might get the path from 'options' or assume a default
                    const schemaPath = options?.path || path.join(context.siteDir, 'schemas');

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
import generateEventDocs from './generate-event-docs.js';

export default function (context, options) {
    return {
        name: 'generate-schema-docs',
        extendCli(cli) {
            cli
                .command('generate schema-docs')
                .description('Generate schema documentation from JSON schemas')
                .action(async () => {
                    await generateEventDocs();
                });
        },
    };
};

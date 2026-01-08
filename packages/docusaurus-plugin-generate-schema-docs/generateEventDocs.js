import fs from 'fs';
import path from 'path';
import loadSchema from './helpers/loadSchema';
import processSchema from './helpers/processSchema';
import MdxTemplate from './helpers/mdx-template.js';

export default async function generateEventDocs(options) {
    const { organizationName, projectName, siteDir, version, url } = options || {};

    let schemaDir;
    let outputDir;

    if (version) {
        if (version !== 'current') {
            schemaDir = path.join(siteDir, 'static/schemas', version);
            outputDir = path.join(siteDir, 'versioned_docs', `version-${version}`, 'events');
        } else {
            schemaDir = path.join(siteDir, 'static/schemas', 'next');
            outputDir = path.join(siteDir, 'docs/events');
        }
    } else {
        // Non-versioned
        schemaDir = path.join(siteDir, 'static/schemas');
        outputDir = path.join(siteDir, 'docs/events');
    }

    const baseEditUrl = `https://github.com/${organizationName}/${projectName}/edit/main`;
    // CONFIGURATION
    const SCHEMA_DIR = schemaDir; // Where your JSON files are
    const OUTPUT_DIR = outputDir; // Where MDX goes
    const PARTIALS_DIR = path.join(siteDir, 'docs/partials'); // Where your partials are

    // Ensure output dir exists
    if (!fs.existsSync(OUTPUT_DIR))
    {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Read all JSON files
    const files = fs.readdirSync(SCHEMA_DIR).filter(file => file.endsWith('.json'));

    console.log(`🚀 Generating documentation for ${files.length} schemas...`);

    for (const file of files)
    {
        const filePath = path.join(SCHEMA_DIR, file);
        const schema = loadSchema(filePath);

        // Update the $id of the schema in memory for documentation generation
        // This doesn't modify the file on disk - that's handled by update-schema-ids
        if (version) {
            const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            if (version !== 'current') {
                schema.$id = `${baseUrl}/schemas/${version}/${file}`;
            } else {
                schema.$id = `${baseUrl}/schemas/next/${file}`;
            }
        }

        const mergedSchema = await processSchema(filePath);
        const eventName = file.replace('.json', '');

        // Check for partials
        const topPartialPath = path.join(PARTIALS_DIR, `${eventName}.mdx`);
        const bottomPartialPath = path.join(PARTIALS_DIR, `${eventName}_bottom.mdx`);

        let topPartialImport = '';
        let topPartialComponent = '';
        if (fs.existsSync(topPartialPath)) {
            topPartialImport = `import TopPartial from '@site/docs/partials/${eventName}.mdx';`;
            topPartialComponent = '<TopPartial />';
        }

        let bottomPartialImport = '';
        let bottomPartialComponent = '';
        if (fs.existsSync(bottomPartialPath)) {
            bottomPartialImport = `import BottomPartial from '@site/docs/partials/${eventName}_bottom.mdx';`;
            bottomPartialComponent = '<BottomPartial />';
        }

        const mdxContent = MdxTemplate({
            schema,
            mergedSchema,
            baseEditUrl,
            file,
            topPartialImport,
            bottomPartialImport,
            topPartialComponent,
            bottomPartialComponent
        });

        // Write the .mdx file
        const outputFilename = file.replace('.json', '.mdx');
        fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), mdxContent);
        console.log(`✅ Generated docs/events/${outputFilename}`);
    }

    console.log('🎉 Documentation generation complete!');
}

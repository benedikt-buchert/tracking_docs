import fs from 'fs';
import path from 'path';
import loadSchema from './helpers/loadSchema';
import processSchema from './helpers/processSchema';
import MdxTemplate from './helpers/mdx-template.js';

export default async function generateEventDocs(options) {
    const { organizationName, projectName, siteDir } = options || {};
    const baseEditUrl = `https://github.com/${organizationName}/${projectName}/edit/main`;
    // CONFIGURATION
    const SCHEMA_DIR = path.join(siteDir, 'static/schemas'); // Where your JSON files are
    const OUTPUT_DIR = path.join(siteDir, 'docs/events'); // Where MDX goes
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

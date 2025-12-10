import $RefParser from "@apidevtools/json-schema-ref-parser";
import fs from 'fs';
import path from 'path';

// CONFIGURATION
const SCHEMA_DIR = 'schemas'; // Where your JSON files are
const OUTPUT_DIR = 'docs/events'; // Where MDX goes

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR))
{
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read all JSON files
const files = fs.readdirSync(SCHEMA_DIR).filter(file => file.endsWith('.json'));

console.log(`🚀 Generating documentation for ${files.length} schemas...`);

files.forEach(async file => {
    const filePath = path.join(SCHEMA_DIR, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const schema = JSON.parse(rawContent);
    const clonedSchema = await $RefParser.dereference(schema, { mutateInputSchema: false });

    // Define the MDX Content
    // We embed the JSON directly into the file to avoid Webpack import issues
    const mdxContent = `---
title: ${schema.title}
description: ${schema.description}
sidebar_label: ${schema.title}
---

import SchemaViewer from '@site/src/components/SchemaViewer';

# ${schema.title}

${schema.description}

<SchemaViewer schema={${JSON.stringify(clonedSchema)}} />

`;

    // Write the .mdx file
    const outputFilename = file.replace('.json', '.mdx');
    fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), mdxContent);
    console.log(`✅ Generated docs/events/${outputFilename}`);
});

console.log('🎉 Documentation generation complete!');
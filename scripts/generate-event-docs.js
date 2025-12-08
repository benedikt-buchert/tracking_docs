const fs = require('fs');
const path = require('path');

// CONFIGURATION
const SCHEMA_DIR = path.join(__dirname, '..', 'schemas'); // Where your JSON files are
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'events'); // Where MDX goes

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR))
{
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read all JSON files
const files = fs.readdirSync(SCHEMA_DIR).filter(file => file.endsWith('.json'));

console.log(`🚀 Generating documentation for ${files.length} schemas...`);

files.forEach(file => {
    const filePath = path.join(SCHEMA_DIR, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const schema = JSON.parse(rawContent);

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

<SchemaViewer schema={${rawContent}} />

`;

    // Write the .mdx file
    const outputFilename = file.replace('.json', '.mdx');
    fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), mdxContent);
    console.log(`✅ Generated docs/events/${outputFilename}`);
});

console.log('🎉 Documentation generation complete!');
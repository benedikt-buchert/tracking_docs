import $RefParser from "@apidevtools/json-schema-ref-parser";
import mergeJsonSchema from "json-schema-merge-allof";
import fs from 'fs';
import path from 'path';

export default async function generateEventDocs(siteDir) {
    // CONFIGURATION
    const SCHEMA_DIR = path.join(siteDir, 'schemas'); // Where your JSON files are
    const OUTPUT_DIR = path.join(siteDir, 'docs/events'); // Where MDX goes

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
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const schema = JSON.parse(rawContent);

        // First, dereference all $ref properties
        const clonedSchema = await $RefParser.dereference(filePath, {
            mutateInputSchema: false, dereference: {
                circular: 'ignore'
            }
        });

        // Then merge allOf properties
        const mergedSchema = mergeJsonSchema(clonedSchema, {
            resolvers: {
                defaultResolver: mergeJsonSchema.options.resolvers.title
            }
        });

        // Define the MDX Content
        // We embed the JSON directly into the file to avoid Webpack import issues
        const mdxContent = `---
title: ${schema.title}
description: ${schema.description}
sidebar_label: ${schema.title}
---

import SchemaViewer from '@theme/SchemaViewer';
import SchemaJsonViewer from '@theme/SchemaJsonViewer';

# ${schema.title}

${schema.description}

<SchemaViewer schema={${JSON.stringify(mergedSchema)}} />
<SchemaJsonViewer schema={${JSON.stringify(schema)}} />
`;

        // Write the .mdx file
        const outputFilename = file.replace('.json', '.mdx');
        fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), mdxContent);
        console.log(`✅ Generated docs/events/${outputFilename}`);
    }

    console.log('🎉 Documentation generation complete!');
}

import path from 'path';
import fs from 'fs';
import { getPathsForVersion } from './helpers/path-helpers.js';
import { readSchemas, writeDoc, createDir } from './helpers/file-system.js';
import { processOneOfSchema, slugify } from './helpers/schema-processing.js';
import SchemaDocTemplate from './helpers/schema-doc-template.js';
import ChoiceIndexTemplate from './helpers/choice-index-template.js';
import processSchema from './helpers/processSchema.js';

async function generateAndWriteDoc(
  filePath,
  schema,
  eventName,
  outputDir,
  options,
) {
  const { organizationName, projectName, siteDir } = options;
  const baseEditUrl = `https://github.com/${organizationName}/${projectName}/edit/main`;
  const PARTIALS_DIR = path.join(siteDir, 'docs/partials');

  const mergedSchema = await processSchema(filePath);

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

  const editUrl = `${baseEditUrl}/${path.relative(
    path.join(siteDir, '..'),
    filePath,
  )}`;

  const mdxContent = SchemaDocTemplate({
    schema,
    mergedSchema,
    editUrl,
    file: path.basename(filePath),
    topPartialImport,
    bottomPartialImport,
    topPartialComponent,
    bottomPartialComponent,
  });

  const outputFilename = path.basename(filePath).replace('.json', '.mdx');
  writeDoc(outputDir, outputFilename, mdxContent);
}

export default async function generateEventDocs(options) {
  const { siteDir, version, url } = options || {};
  const { schemaDir, outputDir } = getPathsForVersion(version, siteDir);

  createDir(outputDir);
  const schemas = readSchemas(schemaDir);

  console.log(`🚀 Generating documentation for ${schemas.length} schemas...`);

  for (const { fileName, filePath, schema } of schemas) {
    const eventName = fileName.replace('.json', '');

    if (version) {
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      if (version !== 'current') {
        schema.$id = `${baseUrl}/schemas/${version}/${fileName}`;
      } else {
        schema.$id = `${baseUrl}/schemas/next/${fileName}`;
      }
    }

    const choiceType = schema.oneOf ? 'oneOf' : null;

    if (choiceType) {
      const eventOutputDir = path.join(outputDir, eventName);
      createDir(eventOutputDir);

      const indexPageContent = ChoiceIndexTemplate({ schema, choiceType });
      writeDoc(eventOutputDir, 'index.mdx', indexPageContent);

      const processed = processOneOfSchema(schema, filePath);
      for (const { slug, schema: processedSchema } of processed) {
        const tempFilePath = path.join(eventOutputDir, `${slug}.json`);
        fs.writeFileSync(
          tempFilePath,
          JSON.stringify(processedSchema, null, 2),
        );

        await generateAndWriteDoc(
          tempFilePath,
          processedSchema,
          slug,
          eventOutputDir,
          options,
        );
        fs.unlinkSync(tempFilePath);
      }
    } else {
      await generateAndWriteDoc(
        filePath,
        schema,
        eventName,
        outputDir,
        options,
      );
    }
  }

  console.log('🎉 Documentation generation complete!');
}

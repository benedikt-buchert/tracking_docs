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
  alreadyMergedSchema = null,
) {
  const { organizationName, projectName, siteDir, dataLayerName, version } =
    options;
  const baseEditUrl = `https://github.com/${organizationName}/${projectName}/edit/main`;

  const { outputDir: versionOutputDir } = getPathsForVersion(version, siteDir);
  const PARTIALS_DIR = path.join(versionOutputDir, 'partials');
  const relativePartialsDir = path.relative(siteDir, PARTIALS_DIR);

  const mergedSchema = alreadyMergedSchema || (await processSchema(filePath));

  // Check for partials
  const topPartialPath = path.join(PARTIALS_DIR, `_${eventName}.mdx`);
  const bottomPartialPath = path.join(PARTIALS_DIR, `_${eventName}_bottom.mdx`);

  let topPartialImport = '';
  let topPartialComponent = '';
  if (fs.existsSync(topPartialPath)) {
    topPartialImport = `import TopPartial from '@site/${relativePartialsDir}/_${eventName}.mdx';`;
    topPartialComponent = '<TopPartial />';
  }

  let bottomPartialImport = '';
  let bottomPartialComponent = '';
  if (fs.existsSync(bottomPartialPath)) {
    bottomPartialImport = `import BottomPartial from '@site/${relativePartialsDir}/_${eventName}_bottom.mdx';`;
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
    dataLayerName,
  });

  const outputFilename = path.basename(filePath).replace('.json', '.mdx');
  writeDoc(outputDir, outputFilename, mdxContent);
}

async function generateOneOfDocs(
  eventName,
  schema,
  filePath,
  outputDir,
  options,
) {
  const eventOutputDir = path.join(outputDir, eventName);
  createDir(eventOutputDir);

  const processed = await processOneOfSchema(schema, filePath);

  const indexPageContent = ChoiceIndexTemplate({
    schema,
    processedOptions: processed,
  });
  writeDoc(eventOutputDir, 'index.mdx', indexPageContent);

  for (const [
    index,
    { slug, schema: processedSchema },
  ] of processed.entries()) {
    const subChoiceType = processedSchema.oneOf ? 'oneOf' : null;
    const prefixedSlug = `${(index + 1).toString().padStart(2, '0')}-${slug}`;

    if (subChoiceType) {
      const tempFilePath = path.join(eventOutputDir, `${slug}.json`);
      fs.writeFileSync(tempFilePath, JSON.stringify(processedSchema, null, 2));
      await generateOneOfDocs(
        prefixedSlug,
        processedSchema,
        tempFilePath,
        eventOutputDir,
        options,
      );
      fs.unlinkSync(tempFilePath);
    } else {
      const tempFilePath = path.join(eventOutputDir, `${prefixedSlug}.json`);
      fs.writeFileSync(tempFilePath, JSON.stringify(processedSchema, null, 2));
      await generateAndWriteDoc(
        tempFilePath,
        processedSchema,
        slug,
        eventOutputDir,
        options,
        processedSchema,
      );
      fs.unlinkSync(tempFilePath);
    }
  }
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

    if (schema.oneOf) {
      await generateOneOfDocs(eventName, schema, filePath, outputDir, options);
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

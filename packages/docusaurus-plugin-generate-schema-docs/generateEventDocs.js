import path from 'path';
import fs from 'fs';
import { getPathsForVersion } from './helpers/path-helpers.js';
import { readSchemas, writeDoc, createDir } from './helpers/file-system.js';
import { processOneOfSchema, slugify } from './helpers/schema-processing.js';
import SchemaDocTemplate from './helpers/schema-doc-template.js';
import ChoiceIndexTemplate from './helpers/choice-index-template.js';
import processSchema from './helpers/processSchema.js';

function buildEditUrl(organizationName, projectName, siteDir, filePath) {
  const baseEditUrl = `https://github.com/${organizationName}/${projectName}/edit/main`;
  return `${baseEditUrl}/${path.relative(path.join(siteDir, '..'), filePath)}`;
}

function toSiteImportPath(siteDir, absolutePath) {
  return `@site/${path.relative(siteDir, absolutePath).split(path.sep).join('/')}`;
}

function resolvePartial({
  scopedPartialPath,
  fallbackPartialPath,
  componentPrefix,
  siteDir,
  allowFallback,
}) {
  const selectedPartialPath = fs.existsSync(scopedPartialPath)
    ? scopedPartialPath
    : allowFallback && fs.existsSync(fallbackPartialPath)
      ? fallbackPartialPath
      : null;

  if (!selectedPartialPath) return { import: '', component: '' };
  const fileImportPath = toSiteImportPath(siteDir, selectedPartialPath);
  return {
    import: `import ${componentPrefix} from '${fileImportPath}';`,
    component: `<${componentPrefix} />`,
  };
}

async function collectLeafEventNames(schema, filePath, eventNames) {
  if (!schema.oneOf) {
    eventNames.push(path.basename(filePath, '.json'));
    return;
  }

  const processed = await processOneOfSchema(schema, filePath);
  for (const { slug, schema: processedSchema, sourceFilePath } of processed) {
    if (processedSchema.oneOf) {
      await collectLeafEventNames(
        processedSchema,
        sourceFilePath || filePath,
        eventNames,
      );
      continue;
    }
    eventNames.push(slug);
  }
}

async function getPartialNameConflicts(schemas) {
  const eventNames = [];

  for (const { fileName, filePath, schema } of schemas) {
    if (schema.oneOf) {
      await collectLeafEventNames(schema, filePath, eventNames);
      continue;
    }
    eventNames.push(fileName.replace('.json', ''));
  }

  const counts = new Map();
  eventNames.forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );
}

async function generateAndWriteDoc(
  filePath,
  schema,
  eventName,
  outputDir,
  options,
  alreadyMergedSchema = null,
  editFilePath = null,
  partialNameConflicts = new Set(),
) {
  const { organizationName, projectName, siteDir, dataLayerName, version } =
    options;

  const { outputDir: versionOutputDir } = getPathsForVersion(version, siteDir);
  const PARTIALS_DIR = path.join(versionOutputDir, 'partials');
  const docRelativeDir = path.relative(versionOutputDir, outputDir);
  const scopedPartialsDir =
    !docRelativeDir || docRelativeDir === '.'
      ? PARTIALS_DIR
      : path.join(PARTIALS_DIR, docRelativeDir);
  const allowBasenameFallback = !partialNameConflicts.has(eventName);

  const mergedSchema = alreadyMergedSchema || (await processSchema(filePath));

  // Resolve scoped partials first; basename fallback is disabled for ambiguous names.
  const top = resolvePartial({
    scopedPartialPath: path.join(scopedPartialsDir, `_${eventName}.mdx`),
    fallbackPartialPath: path.join(PARTIALS_DIR, `_${eventName}.mdx`),
    componentPrefix: 'TopPartial',
    siteDir,
    allowFallback: allowBasenameFallback,
  });
  const bottom = resolvePartial({
    scopedPartialPath: path.join(scopedPartialsDir, `_${eventName}_bottom.mdx`),
    fallbackPartialPath: path.join(PARTIALS_DIR, `_${eventName}_bottom.mdx`),
    componentPrefix: 'BottomPartial',
    siteDir,
    allowFallback: allowBasenameFallback,
  });

  const editUrl = buildEditUrl(
    organizationName,
    projectName,
    siteDir,
    editFilePath || filePath,
  );

  const mdxContent = SchemaDocTemplate({
    schema,
    mergedSchema,
    editUrl,
    file: path.basename(filePath),
    topPartialImport: top.import,
    bottomPartialImport: bottom.import,
    topPartialComponent: top.component,
    bottomPartialComponent: bottom.component,
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
  partialNameConflicts,
) {
  const { organizationName, projectName, siteDir } = options;
  const editUrl = buildEditUrl(
    organizationName,
    projectName,
    siteDir,
    filePath,
  );

  const eventOutputDir = path.join(outputDir, eventName);
  createDir(eventOutputDir);

  const processed = await processOneOfSchema(schema, filePath);

  const indexPageContent = ChoiceIndexTemplate({
    schema,
    processedOptions: processed,
    editUrl,
  });
  writeDoc(eventOutputDir, 'index.mdx', indexPageContent);

  for (const [
    index,
    { slug, schema: processedSchema, sourceFilePath },
  ] of processed.entries()) {
    const subChoiceType = processedSchema.oneOf ? 'oneOf' : null;
    const prefixedSlug = `${(index + 1).toString().padStart(2, '0')}-${slug}`;

    if (subChoiceType) {
      await generateOneOfDocs(
        prefixedSlug,
        processedSchema,
        sourceFilePath || filePath,
        eventOutputDir,
        options,
        partialNameConflicts,
      );
    } else {
      await generateAndWriteDoc(
        `${prefixedSlug}.json`,
        processedSchema,
        slug,
        eventOutputDir,
        options,
        processedSchema,
        sourceFilePath || filePath,
        partialNameConflicts,
      );
    }
  }
}

export default async function generateEventDocs(options) {
  const { siteDir, version, url } = options || {};
  const { schemaDir, outputDir } = getPathsForVersion(version, siteDir);

  createDir(outputDir);
  const schemas = readSchemas(schemaDir);
  const partialNameConflicts = await getPartialNameConflicts(schemas);

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
      await generateOneOfDocs(
        eventName,
        schema,
        filePath,
        outputDir,
        options,
        partialNameConflicts,
      );
    } else {
      await generateAndWriteDoc(
        filePath,
        schema,
        eventName,
        outputDir,
        options,
        null,
        null,
        partialNameConflicts,
      );
    }
  }

  console.log('🎉 Documentation generation complete!');
}

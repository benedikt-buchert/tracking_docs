export default function MdxTemplate(data) {
  const {
    schema,
    mergedSchema,
    editUrl,
    file,
    topPartialImport,
    bottomPartialImport,
    topPartialComponent,
    bottomPartialComponent,
    dataLayerName,
    exampleModel,
    sourcePath,
    schemaSources,
  } = data;
  const sourceSchema = schemaSources?.[sourcePath] || schema;
  const schemaViewerOptionLines = [
    dataLayerName ? `dataLayerName={'${dataLayerName}'}` : null,
    exampleModel ? `exampleModel={${JSON.stringify(exampleModel)}}` : null,
  ]
    .filter(Boolean)
    .join('\n  ');

  return `---
title: ${schema.title}
description: ${JSON.stringify(schema.description)}
sidebar_label: ${schema.title}
custom_edit_url: ${editUrl}
---

import SchemaViewer from '@theme/SchemaViewer';
import SchemaJsonViewer from '@theme/SchemaJsonViewer';
${topPartialImport}
${bottomPartialImport}

# ${schema.title}

${schema.description}

${topPartialComponent}

<SchemaViewer
  schema={${JSON.stringify(mergedSchema)}}
  sourceSchema={${JSON.stringify(sourceSchema)}}
  sourcePath={${JSON.stringify(sourcePath)}}
  schemaSources={${JSON.stringify(schemaSources)}}
  ${schemaViewerOptionLines}
/>
<SchemaJsonViewer
  schema={${JSON.stringify(schema)}}
  sourcePath={${JSON.stringify(sourcePath)}}
  schemaSources={${JSON.stringify(schemaSources)}}
/>

${bottomPartialComponent}
`;
}

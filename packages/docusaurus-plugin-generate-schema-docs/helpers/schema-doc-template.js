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
  } = data;

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

<SchemaViewer schema={${JSON.stringify(mergedSchema)}} />
<SchemaJsonViewer schema={${JSON.stringify(schema)}} />

${bottomPartialComponent}
`;
}

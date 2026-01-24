export default function ChoiceIndexTemplate(data) {
  const { schema, processedOptions } = data;

  return `---
title: ${schema.title}
description: "${schema.description}"
---
import SchemaJsonViewer from '@theme/SchemaJsonViewer';

# ${schema.title}

${schema.description}

Please select one of the following options:

${processedOptions
  .map((option) => `- [${option.schema.title}](./${option.slug})`)
  .join('\n')}

<SchemaJsonViewer schema={${JSON.stringify(schema)}} />
`;
}

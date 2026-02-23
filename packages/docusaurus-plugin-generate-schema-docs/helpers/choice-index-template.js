export default function ChoiceIndexTemplate(data) {
  const { schema, processedOptions, editUrl } = data;

  return `---
title: ${schema.title}
description: "${schema.description}"
custom_edit_url: ${editUrl}
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

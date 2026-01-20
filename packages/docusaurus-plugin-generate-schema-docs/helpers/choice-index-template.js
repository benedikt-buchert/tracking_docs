import { slugify } from './schema-processing.js';

export default function ChoiceIndexTemplate(data) {
    const { schema, choiceType } = data;

    return `---
title: ${schema.title}
description: "${schema.description}"
---
import SchemaJsonViewer from '@theme/SchemaJsonViewer';

# ${schema.title}

${schema.description}

Please select one of the following options:

${schema[choiceType]
  .map(
    (optionSchema) =>
      `- [${optionSchema.title}](./${slugify(optionSchema.title)})`,
  )
  .join("\n")}

<SchemaJsonViewer schema={${JSON.stringify(schema)}} />
`;
}

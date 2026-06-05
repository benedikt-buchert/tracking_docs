import React from 'react';
import Heading from '@theme/Heading';
import ExampleDataLayer from './ExampleDataLayer';
import PropertiesTable from './PropertiesTable';

export default function SchemaViewer({
  schema,
  sourceSchema,
  sourcePath,
  schemaSources,
  dataLayerName,
  exampleModel,
}) {
  const resolvedSourceSchema =
    (sourcePath && schemaSources?.[sourcePath]) || sourceSchema || schema;

  const hasOneOfAnyOf =
    schema.oneOf ||
    schema.anyOf ||
    (schema.properties &&
      Object.values(schema.properties).some(
        (prop) => prop.oneOf || prop.anyOf,
      ));
  const targets = schema['x-tracking-targets'] ?? [];
  const prefix = targets.includes('web-datalayer-js') ? 'DataLayer' : 'Code';
  const exampleTitle = hasOneOfAnyOf
    ? `${prefix} Examples`
    : `${prefix} Example`;

  return (
    <div>
      <Heading as="h2">{exampleTitle}</Heading>
      <ExampleDataLayer
        schema={schema}
        dataLayerName={dataLayerName}
        exampleModel={exampleModel}
      />

      <Heading as="h2">Event Properties</Heading>
      <PropertiesTable schema={schema} sourceSchema={resolvedSourceSchema} />
    </div>
  );
}

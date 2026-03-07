import { schemaToExamples } from './schemaToExamples';

export const DEFAULT_SNIPPET_TARGET = {
  id: 'web-datalayer-js',
  label: 'Web',
  language: 'javascript',
};

export const findClearableProperties = (schema) => {
  if (!schema || !schema.properties) return [];

  return Object.entries(schema.properties)
    .filter(([, definition]) => definition['x-gtm-clear'] === true)
    .map(([key]) => key);
};

export const generateWebDataLayerSnippet = (
  example,
  schema,
  dataLayerName = 'dataLayer',
) => {
  const clearableProperties = findClearableProperties(schema || {});
  const propertiesToClear = clearableProperties.filter(
    (prop) => prop in example,
  );

  let codeSnippet = '';
  if (propertiesToClear.length > 0) {
    const resetObject = {};
    propertiesToClear.forEach((prop) => {
      resetObject[prop] = null;
    });
    codeSnippet += `window.${dataLayerName}.push(${JSON.stringify(
      resetObject,
      null,
      2,
    )});\n`;
  }

  codeSnippet += `window.${dataLayerName}.push(${JSON.stringify(
    example,
    null,
    2,
  )});`;

  return codeSnippet;
};

export function buildExampleModel(schema, { dataLayerName } = {}) {
  const exampleGroups = schemaToExamples(schema);

  if (!exampleGroups || exampleGroups.length === 0) {
    return {
      targets: [DEFAULT_SNIPPET_TARGET],
      variantGroups: [],
      isSimpleDefault: false,
    };
  }

  const variantGroups = exampleGroups.map((group) => ({
    property: group.property,
    options: group.options.map((option, index) => ({
      id: `${group.property}-${index}`,
      title: option.title,
      example: option.example,
      snippets: {
        [DEFAULT_SNIPPET_TARGET.id]: generateWebDataLayerSnippet(
          option.example,
          schema,
          dataLayerName,
        ),
      },
    })),
  }));

  return {
    targets: [DEFAULT_SNIPPET_TARGET],
    variantGroups,
    isSimpleDefault:
      variantGroups.length === 1 && variantGroups[0].property === 'default',
  };
}

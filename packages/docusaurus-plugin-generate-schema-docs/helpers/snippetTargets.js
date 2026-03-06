export const DEFAULT_SNIPPET_TARGET_ID = 'web-datalayer-js';

export const findClearableProperties = (schema) => {
  if (!schema || !schema.properties) return [];

  return Object.entries(schema.properties)
    .filter(([, definition]) => definition['x-gtm-clear'] === true)
    .map(([key]) => key);
};

function generateWebDataLayerSnippet({
  example,
  schema,
  config = {},
  dataLayerName,
}) {
  const resolvedDataLayerName =
    dataLayerName || config.dataLayerName || 'dataLayer';
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
    codeSnippet += `window.${resolvedDataLayerName}.push(${JSON.stringify(
      resetObject,
      null,
      2,
    )});\n`;
  }

  codeSnippet += `window.${resolvedDataLayerName}.push(${JSON.stringify(
    example,
    null,
    2,
  )});`;

  return codeSnippet;
}

function generatePlaceholderSnippet({ example, targetId }) {
  return `// Target "${targetId}" snippet generator not implemented yet.\n${JSON.stringify(
    example,
    null,
    2,
  )}`;
}

export const SNIPPET_TARGETS = [
  {
    id: 'web-datalayer-js',
    group: 'web',
    label: 'Web Data Layer (JS)',
    language: 'javascript',
    generator: generateWebDataLayerSnippet,
  },
  {
    id: 'android-firebase-kotlin-sdk',
    group: 'android',
    label: 'Android Firebase (Kotlin)',
    language: 'kotlin',
    generator: generatePlaceholderSnippet,
  },
  {
    id: 'android-firebase-java-sdk',
    group: 'android',
    label: 'Android Firebase (Java)',
    language: 'java',
    generator: generatePlaceholderSnippet,
  },
  {
    id: 'ios-firebase-swift-sdk',
    group: 'ios',
    label: 'iOS Firebase (Swift)',
    language: 'swift',
    generator: generatePlaceholderSnippet,
  },
  {
    id: 'ios-firebase-objc-sdk',
    group: 'ios',
    label: 'iOS Firebase (Obj-C)',
    language: 'objectivec',
    generator: generatePlaceholderSnippet,
  },
];

export function getSnippetTarget(targetId = DEFAULT_SNIPPET_TARGET_ID) {
  const target = SNIPPET_TARGETS.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Unknown snippet target: ${targetId}`);
  }
  return target;
}

export function generateSnippetForTarget({
  targetId = DEFAULT_SNIPPET_TARGET_ID,
  example,
  schema,
  config = {},
  dataLayerName,
}) {
  const target = getSnippetTarget(targetId);
  return target.generator({
    example,
    schema,
    config,
    dataLayerName,
    targetId,
  });
}

import { schemaToExamples } from './schemaToExamples';

function hasUsefulPayload(payload) {
  return (
    typeof payload !== 'undefined' &&
    (typeof payload !== 'object' ||
      payload === null ||
      Object.keys(payload).length > 0)
  );
}

export function buildExamplePayloads(schema) {
  return schemaToExamples(schema).flatMap((group) =>
    group.options
      .filter((option) => hasUsefulPayload(option.example))
      .map((option) => ({
        title: option.title,
        variant: { property: group.property, option: option.title },
        payload: option.example,
      })),
  );
}

import { schemaToExamples } from './schemaToExamples';
import {
  createTrackingTargetRegistry,
  DEFAULT_SNIPPET_TARGET_ID,
  findClearableProperties,
  generateSnippetForTarget,
} from './snippetTargets';

const DEFAULT_TARGET_REGISTRY = createTrackingTargetRegistry();

export function resolveExampleTargets(
  schema,
  { targetRegistry = DEFAULT_TARGET_REGISTRY } = {},
) {
  const configured = schema?.['x-tracking-targets'];
  const targetIds =
    Array.isArray(configured) && configured.length > 0
      ? configured
      : [DEFAULT_SNIPPET_TARGET_ID];

  const targets = targetIds
    .map((id) => {
      try {
        return targetRegistry.get(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (targets.length > 0) return targets;
  return [targetRegistry.get(DEFAULT_SNIPPET_TARGET_ID)];
}

export function buildExampleModel(
  schema,
  { dataLayerName, targetRegistry = DEFAULT_TARGET_REGISTRY } = {},
) {
  const exampleGroups = schemaToExamples(schema);
  const targets = resolveExampleTargets(schema, { targetRegistry });

  if (!exampleGroups || exampleGroups.length === 0) {
    return {
      targets,
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
      snippets: Object.fromEntries(
        targets.map((target) => [
          target.id,
          generateSnippetForTarget({
            targetId: target.id,
            example: option.example,
            schema,
            dataLayerName,
            targetRegistry,
          }),
        ]),
      ),
    })),
  }));

  return {
    targets,
    variantGroups,
    isSimpleDefault:
      variantGroups.length === 1 && variantGroups[0].property === 'default',
  };
}

export { findClearableProperties };

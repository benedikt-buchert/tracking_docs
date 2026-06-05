import {
  createTrackingTargetRegistry,
  DEFAULT_SNIPPET_TARGET_ID,
} from './snippetTargets.js';

const DEFAULT_TARGET_REGISTRY = createTrackingTargetRegistry();

export const DEFAULT_TRACKING_TARGET = DEFAULT_SNIPPET_TARGET_ID;

export const SUPPORTED_TRACKING_TARGETS = DEFAULT_TARGET_REGISTRY.ids();

const TARGET_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/;

const SUPPORTED_CALL_METHODS = ['track', 'identify', 'group', 'page', 'alias'];
const DOTTED_METHOD_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;

export function resolveCallMethod(schema) {
  const method = schema?.['x-method'];

  if (method == null) {
    return { method: 'track', errors: [] };
  }

  if (typeof method !== 'string') {
    return { method: null, errors: ['x-method must be a string.'] };
  }

  if (
    SUPPORTED_CALL_METHODS.includes(method) ||
    DOTTED_METHOD_PATTERN.test(method)
  ) {
    return { method, errors: [] };
  }

  return {
    method: null,
    errors: [
      `x-method "${method}" is not supported. Use one of: ${SUPPORTED_CALL_METHODS.join(', ')}.`,
    ],
  };
}

function isReferenceAggregatorSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  const hasChoiceAggregation =
    Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf);
  const hasPropertiesKeyword = Object.hasOwn(schema, 'properties');
  const hasValidPropertiesMap =
    hasPropertiesKeyword &&
    schema.properties &&
    typeof schema.properties === 'object' &&
    !Array.isArray(schema.properties);
  const hasOwnProperties =
    hasValidPropertiesMap && Object.keys(schema.properties).length > 0;

  return (
    hasChoiceAggregation &&
    (!hasPropertiesKeyword || (hasValidPropertiesMap && !hasOwnProperties))
  );
}

export function resolveTrackingTargets(
  schema,
  {
    schemaFile = 'schema',
    isQuiet = false,
    targetRegistry = DEFAULT_TARGET_REGISTRY,
  } = {},
) {
  const configuredTargets = schema?.['x-tracking-targets'];

  if (configuredTargets == null) {
    const warning =
      isQuiet || isReferenceAggregatorSchema(schema)
        ? null
        : `Schema ${schemaFile} is missing x-tracking-targets. Falling back to "${DEFAULT_TRACKING_TARGET}".`;
    return {
      targets: [DEFAULT_TRACKING_TARGET],
      warning,
      errors: [],
    };
  }

  if (
    !Array.isArray(configuredTargets) ||
    configuredTargets.length === 0 ||
    configuredTargets.some((target) => typeof target !== 'string')
  ) {
    return {
      targets: [],
      warning: null,
      errors: [
        'x-tracking-targets must be a non-empty array of string target IDs.',
      ],
    };
  }

  const errors = [];
  const unknownTargets = configuredTargets.filter(
    (target) => !targetRegistry.has(target),
  );

  if (unknownTargets.length > 0) {
    errors.push(
      `x-tracking-targets contains unsupported target(s): ${unknownTargets.join(
        ', ',
      )}.`,
    );
  }

  const badlyFormattedTargets = configuredTargets.filter(
    (target) => !TARGET_ID_PATTERN.test(target),
  );
  if (badlyFormattedTargets.length > 0) {
    errors.push(
      `x-tracking-targets must use lowercase kebab-case IDs like "web-datalayer-js". Invalid value(s): ${badlyFormattedTargets.join(
        ', ',
      )}.`,
    );
  }

  return {
    targets: errors.length === 0 ? configuredTargets : [],
    warning: null,
    errors,
  };
}

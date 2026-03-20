/**
 * The ESLint selector that matches every property definition node
 * inside any "properties" keyword, at any depth (including if/then/else).
 */
const PROPERTY_DEFINITION_SELECTOR =
  'JSONProperty[key.value="properties"] > JSONObjectExpression > JSONProperty';

/**
 * Returns the set of keys present in a property definition object node.
 * @param {import('jsonc-eslint-parser').JSONObjectExpression} definitionNode
 * @returns {Set<string>}
 */
function getKeys(definitionNode) {
  return new Set(
    definitionNode.properties.map((p) => p.key.value ?? p.key.name),
  );
}

/**
 * Returns true when the matched property definition lives inside an `if` block.
 * Those entries are schema conditions used for matching — not documented properties.
 *
 * AST ancestry from the matched node upward:
 *   JSONProperty (the property, e.g. "country")
 *   └─ JSONObjectExpression  (the "properties" value map)
 *      └─ JSONProperty        (key = "properties")
 *         └─ JSONObjectExpression  (the "if" / "then" / "else" value)
 *            └─ JSONProperty        (key = "if" | "then" | "else")
 *
 * @param {import('eslint').Rule.Node} node - the matched JSONProperty node
 * @returns {boolean}
 */
function isInsideIfBlock(node) {
  const propertiesKey = node.parent?.parent; // JSONProperty key="properties"
  const blockValue = propertiesKey?.parent; // JSONObjectExpression (if/then/else value)
  const blockKey = blockValue?.parent; // JSONProperty key="if"|"then"|"else"
  return blockKey?.key?.value === 'if';
}

/**
 * Returns true when the property definition is a pure $ref with no other keys.
 * Annotations live in the referenced file, so all checks should be skipped.
 * @param {Set<string>} keys
 * @returns {boolean}
 */
function isPureRef(keys) {
  return keys.size === 1 && keys.has('$ref');
}

/**
 * Annotation and structural keys that indicate a property definition is being
 * documented or typed. If none of these are present the definition is a
 * constraint-only refinement (e.g. `{ maxLength: 300 }` in a then/else block)
 * that adds rules to a property defined elsewhere — skip all annotation checks.
 */
const ANNOTATION_OR_STRUCTURAL_KEYS = new Set([
  'type',
  'const',
  'enum',
  'oneOf',
  'anyOf',
  'allOf',
  '$ref',
  'description',
  'examples',
  'example',
  'properties',
  'items',
]);

/**
 * Returns true when the property definition contains only constraint keywords
 * (minLength, maxLength, pattern, minimum, etc.) and no annotation or
 * structural keywords. These are refinements applied to properties defined
 * elsewhere and should not be required to carry annotations.
 * @param {Set<string>} keys
 * @returns {boolean}
 */
function isConstraintOnlyRefinement(keys) {
  return ![...keys].some((k) => ANNOTATION_OR_STRUCTURAL_KEYS.has(k));
}

module.exports = {
  PROPERTY_DEFINITION_SELECTOR,
  getKeys,
  isInsideIfBlock,
  isPureRef,
  isConstraintOnlyRefinement,
};

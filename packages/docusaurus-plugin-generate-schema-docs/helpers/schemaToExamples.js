import buildExampleFromSchema from './buildExampleFromSchema';

/**
 * This is the main helper that generates a list of complete example objects,
 * grouped by the property that contains the choice.
 *
 * @param {object} rootSchema The complete schema for the event.
 * @returns {object[]} An array of group objects.
 */
export function schemaToExamples(rootSchema) {
  const choicePoints = [];

  // 1. Find all choice points in the schema recursively
  function findChoices(subSchema, path = []) {
    if (!subSchema) return;

    // First, check for choices at the current schema level
    const choiceType = subSchema.oneOf
      ? 'oneOf'
      : subSchema.anyOf
        ? 'anyOf'
        : null;
    if (choiceType) {
      choicePoints.push({ path, schema: subSchema });
    }

    // Then, recurse into any nested properties
    if (subSchema.properties) {
      for (const [key, propSchema] of Object.entries(subSchema.properties)) {
        findChoices(propSchema, [...path, 'properties', key]);
      }
    }
  }

  findChoices(rootSchema);

  // 2. If no choices are found, generate a single default example
  if (choicePoints.length === 0) {
    const example = buildExampleFromSchema(rootSchema);
    if (example && Object.keys(example).length > 0) {
      // Return in the same group structure for consistency
      return [
        {
          property: 'default',
          options: [{ title: 'Example', example }],
        },
      ];
    }
    return [];
  }

  // 3. Map each found choice point to a "group" of examples
  return choicePoints.map(({ path, schema }) => {
    const choiceType = schema.oneOf ? 'oneOf' : 'anyOf';
    const choices = schema[choiceType];
    const propertyName = path.length > 0 ? path[path.length - 1] : 'root';

    // For each option within the choice, generate a complete example
    const options = choices.map((option) => {
      // Create a deep copy of the root schema to modify for this specific example
      const schemaVariant = JSON.parse(JSON.stringify(rootSchema));

      // If path is empty, the choice is at the root of the schema.
      if (path.length === 0) {
        // Merge the chosen option's properties into the root properties
        schemaVariant.properties = {
          ...schemaVariant.properties,
          ...option.properties,
        };
        // Remove the choice block from the root
        delete schemaVariant.oneOf;
        delete schemaVariant.anyOf;
      } else {
        // The choice is nested. Find the parent of the choice block in the copied schema.
        let parentOfChoice = schemaVariant;
        for (let i = 0; i < path.length; i++) {
          parentOfChoice = parentOfChoice[path[i]];
        }

        // Delete the choice keywords and merge the selected option.
        // This preserves other properties on the parent (like `type` and `description`).
        delete parentOfChoice.oneOf;
        delete parentOfChoice.anyOf;
        Object.assign(parentOfChoice, option);
      }

      const example = buildExampleFromSchema(schemaVariant);
      return {
        title: option.title || 'Option',
        example,
      };
    });

    return {
      property: propertyName,
      options,
    };
  });
}

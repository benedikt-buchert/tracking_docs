import { createValidator } from './helpers/validator.js';
import fs from 'fs';
import path from 'path';
import processSchema from './helpers/processSchema.js';
import { schemaToExamples } from './helpers/schemaToExamples.js';
import {
  resolveTrackingTargets,
  resolveCallMethod,
} from './helpers/trackingTargets.js';
import { createTrackingTargetRegistry } from './helpers/snippetTargets.js';

const DEFAULT_TARGET_REGISTRY = createTrackingTargetRegistry();

function normalizeTargetValidationErrors(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === 'string') return [result];
  if (Array.isArray(result.errors)) return result.errors;
  return [];
}

function validateTrackingTargetHooks({
  trackingTargets,
  targetRegistry,
  schema,
}) {
  return trackingTargets.targets.flatMap((targetId) => {
    const target = targetRegistry.get(targetId);
    if (typeof target.validateSchema !== 'function') return [];
    return normalizeTargetValidationErrors(target.validateSchema(schema)).map(
      (error) => `[${targetId}] ${error}`,
    );
  });
}

function formatTargetGenerationError(targetId, error) {
  const message = error?.message || String(error);
  return message.startsWith(`[${targetId}]`)
    ? message
    : `[${targetId}] ${message}`;
}

function validateTrackingTargetSnippet({
  trackingTargets,
  targetRegistry,
  schema,
  example,
  dataLayerName,
}) {
  const errors = [];

  trackingTargets.targets.forEach((targetId) => {
    try {
      targetRegistry.generateSnippet({
        targetId,
        example,
        schema,
        dataLayerName,
      });
    } catch (error) {
      errors.push(formatTargetGenerationError(targetId, error));
    }
  });

  return errors;
}

const validateSingleSchema = async (
  filePath,
  schemaPath,
  { targetRegistry = DEFAULT_TARGET_REGISTRY, dataLayerName } = {},
) => {
  const file = path.basename(filePath);
  const errors = [];
  let allValid = true;

  try {
    const mergedSchema = await processSchema(filePath);
    const exampleGroups = schemaToExamples(mergedSchema);
    const originalSchema = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const trackingTargets = resolveTrackingTargets(originalSchema, {
      schemaFile: file,
      targetRegistry,
    });

    if (trackingTargets.warning) {
      console.warn(trackingTargets.warning);
    }
    if (trackingTargets.errors.length > 0) {
      trackingTargets.errors.forEach((error) =>
        errors.push(`x Schema ${file} ${error}`),
      );
      return { allValid: false, errors };
    }

    validateTrackingTargetHooks({
      trackingTargets,
      targetRegistry,
      schema: originalSchema,
    }).forEach((error) => errors.push(`x Schema ${file} ${error}`));
    if (errors.length > 0) {
      return { allValid: false, errors };
    }

    const callMethod = resolveCallMethod(originalSchema);
    if (callMethod.errors.length > 0) {
      callMethod.errors.forEach((error) =>
        errors.push(`x Schema ${file} ${error}`),
      );
      return { allValid: false, errors };
    }

    const validate = await createValidator([], originalSchema, schemaPath);

    if (exampleGroups.length === 0) {
      errors.push(`x Schema ${file} does not produce any examples.`);
      return { allValid: false, errors };
    }

    let fileHasValidExample = false;
    let fileHasAnyExample = false;

    for (const group of exampleGroups) {
      for (const option of group.options) {
        fileHasAnyExample = true;
        const { example, title } = option;

        if (typeof example === 'undefined') {
          errors.push(
            `x Schema ${file} (option: ${title}) does not produce a valid example.`,
          );
          allValid = false;
          continue;
        }

        const result = validate(example);
        if (result.valid) {
          fileHasValidExample = true;
          validateTrackingTargetSnippet({
            trackingTargets,
            targetRegistry,
            schema: mergedSchema,
            example,
            dataLayerName,
          }).forEach((error) => {
            errors.push(`x Schema ${file} (option: ${title}) ${error}`);
            allValid = false;
          });
        } else {
          errors.push(
            `x Schema ${file} (option: ${title}) example data failed validation:`,
          );
          errors.push(JSON.stringify(result.errors, null, 2));
          allValid = false;
        }
      }
    }

    if (fileHasAnyExample && !fileHasValidExample) {
      errors.push(
        `x Schema ${file} had examples, but none of them were valid.`,
      );
      allValid = false;
    }
  } catch (error) {
    errors.push(`x Error processing ${file}: ${error.message}`);
    allValid = false;
  }

  return { allValid, errors };
};

const validateSchemas = async (
  schemaPath,
  { targetRegistry = DEFAULT_TARGET_REGISTRY, dataLayerName } = {},
) => {
  const topLevelSchemaFiles = fs
    .readdirSync(schemaPath)
    .filter((file) => file.endsWith('.json'));

  const results = await Promise.all(
    topLevelSchemaFiles.map((file) => {
      const filePath = path.join(schemaPath, file);
      return validateSingleSchema(filePath, schemaPath, {
        targetRegistry,
        dataLayerName,
      });
    }),
  );

  const allSucceeded = results.every((r) => r.allValid);

  if (!allSucceeded) {
    results.forEach((r) => {
      r.errors.forEach((e) => console.error(e));
    });
  }

  return allSucceeded;
};

export default validateSchemas;

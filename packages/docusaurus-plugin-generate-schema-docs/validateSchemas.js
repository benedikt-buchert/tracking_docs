import { createValidator } from './helpers/validator.js';
import fs from 'fs';
import path from 'path';
import processSchema from './helpers/processSchema.js';
import { schemaToExamples } from './helpers/schemaToExamples.js';

const validateSingleSchema = async (filePath, schemaPath) => {
  const file = path.basename(filePath);
  const errors = [];
  let allValid = true;

  try {
    const mergedSchema = await processSchema(filePath);
    const exampleGroups = schemaToExamples(mergedSchema);
    const originalSchema = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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

        if (!example) {
          errors.push(
            `x Schema ${file} (option: ${title}) does not produce a valid example.`,
          );
          allValid = false;
          continue;
        }

        const result = validate(example);
        if (result.valid) {
          fileHasValidExample = true;
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

const validateSchemas = async (schemaPath) => {
  const topLevelSchemaFiles = fs
    .readdirSync(schemaPath)
    .filter((file) => file.endsWith('.json'));

  const results = await Promise.all(
    topLevelSchemaFiles.map((file) => {
      const filePath = path.join(schemaPath, file);
      return validateSingleSchema(filePath, schemaPath);
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

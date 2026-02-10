import { createValidator } from './helpers/validator.js';
import fs from 'fs';
import path from 'path';
import processSchema from './helpers/processSchema.js';
import buildExampleFromSchema from './helpers/buildExampleFromSchema.js';

const validateSchemas = async (schemaPath) => {
  const topLevelSchemaFiles = fs
    .readdirSync(schemaPath)
    .filter((file) => file.endsWith('.json'));

  let allValid = true;

  for (const file of topLevelSchemaFiles) {
    const filePath = path.join(schemaPath, file);

    try {
      // Build the example data
      const mergedSchema = await processSchema(filePath);
      const example_data = buildExampleFromSchema(mergedSchema);

      if (!example_data) {
        console.error(`x Schema ${file} does not produce a valid example.`);
        allValid = false;
        continue;
      }

      // Load the specific schema we are validating right now
      const originalSchema = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Create the validator using the new logic
      const validate = await createValidator([], originalSchema, schemaPath);

      // Run validation
      const result = validate(example_data);

      if (result.valid) {
        console.log(`OK Schema ${file} produced a valid example.`);
      } else {
        console.error(`x Schema ${file} example data failed validation:`);
        console.error(result.errors);
        allValid = false;
      }
    } catch (error) {
      console.error(`x Error processing ${file}:`, error.message);
      throw error;
    }
  }

  return allValid;
};

export default validateSchemas;

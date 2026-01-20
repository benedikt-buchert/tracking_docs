import fs from 'fs';
import path from 'path';
import buildExampleFromSchema from './helpers/buildExampleFromSchema';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import processSchema from './helpers/processSchema';

const validateSchemas = async (schemaPath) => {
    const ajv = new Ajv2020();
    addFormats(ajv);
    ajv.addKeyword('x-gtm-clear');

    const getAllFiles = (dir, allFiles = []) => {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory())
            {
                getAllFiles(filePath, allFiles);
            } else
            {
                if (file.endsWith('.json'))
                {
                    allFiles.push(filePath);
                }
            }
        });
        return allFiles;
    };

    const allSchemaFiles = getAllFiles(schemaPath);
    for (const file of allSchemaFiles)
    {
        const schemaContent = fs.readFileSync(file, 'utf-8');
        const schema = JSON.parse(schemaContent);
        ajv.addSchema(schema);
    }

    const schemaFiles = fs.readdirSync(schemaPath).filter(file => file.endsWith('.json'));
    let allValid = true;
    for (const file of schemaFiles)
    {
        const filePath = path.join(schemaPath, file);

        const mergedSchema = await processSchema(filePath);

        const example_data = buildExampleFromSchema(mergedSchema);

        if (!example_data)
        {
            console.error(`x Schema ${file} does not produce a valid example.`);
            allValid = false;
        } else
        {
            const originalSchema = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const validate = ajv.getSchema(originalSchema.$id);
            if (!validate)
            {
                console.error(`x Could not find compiled schema for ${originalSchema.$id}`);
                allValid = false;
                continue;
            }
            if (validate(example_data))
            {
                console.log(`OK Schema ${file} produced a valid example.`);
            } else
            {
                console.error(`x Schema ${file} example data failed validation:`);
                console.error(validate.errors);
                allValid = false;
            }
        }
    }
    return allValid;
};

export default validateSchemas;

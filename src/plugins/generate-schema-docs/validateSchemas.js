import fs from 'fs';
import path from 'path';
import buildExampleFromSchema from './helpers/buildExampleFromSchema';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import Ajv2020 from 'ajv/dist/2020.js';

const validateSchemas = async (schemaPath) => {
    const ajv = new Ajv2020();
    ajv.addKeyword('x-gtm-clear');
    const schemaFiles = fs.readdirSync(schemaPath).filter(file => file.endsWith('.json'));
    let allValid = true;
    for (const file of schemaFiles)
    {
        const filePath = path.join(schemaPath, file);
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const schema = JSON.parse(rawContent);
        const clonedSchema = await $RefParser.dereference(schema, { mutateInputSchema: false });

        const example_data = buildExampleFromSchema(clonedSchema);
        if (!example_data)
        {
            console.error(`❌ Schema ${file} does not produce a valid example.`);
            allValid = false;
        } else
        {
            const validate = ajv.compile(clonedSchema);
            if (validate(example_data))
            {
                console.log(`✅ Schema ${file} produced a valid example.`);
            } else
            {
                console.error(`❌ Schema ${file} example data failed validation:`);
                console.error(validate.errors);
                allValid = false;
            }
        }
    }
    return allValid;
};

export default validateSchemas;

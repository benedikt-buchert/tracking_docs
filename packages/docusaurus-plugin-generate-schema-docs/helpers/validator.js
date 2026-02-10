import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import Ajv2019 from 'ajv/dist/2019.js';
import AjvDraft4 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import ajvKeywords from 'ajv-keywords';
import path from 'path';
import { promises as fs } from 'fs';
import { URL } from 'url';

function createAjvInstance(schemas, mainSchema, schemaPath) {
  const schemaVersion = mainSchema?.$schema;

  const loadSchema = async (uri) => {
    let localPath;
    if (uri.startsWith('http')) {
      const url = new URL(uri);
      const pathFromUrl = url.pathname.startsWith('/schemas/')
        ? url.pathname.substring('/schemas/'.length)
        : url.pathname;
      localPath = path.join(schemaPath, pathFromUrl);
    } else {
      localPath = path.resolve(schemaPath, uri);
    }
    const schemaContent = await fs.readFile(localPath, 'utf-8');
    return JSON.parse(schemaContent);
  };

  const options = { allErrors: true, schemas: schemas };

  let ajv;
  if (schemaVersion?.includes('2020-12')) {
    options.strict = false;
    options.loadSchema = loadSchema;
    ajv = new Ajv2020(options);
  } else if (schemaVersion?.includes('2019-09')) {
    options.strict = false;
    options.loadSchema = loadSchema;
    ajv = new Ajv2019(options);
  } else if (schemaVersion?.includes('draft-07')) {
    options.strict = false;
    options.loadSchema = loadSchema;
    ajv = new Ajv(options);
  } else if (schemaVersion?.includes('draft-06')) {
    options.strict = false;
    options.loadSchema = loadSchema;
    ajv = new Ajv(options);
  } else if (schemaVersion?.includes('draft-04')) {
    ajv = new AjvDraft4();
    schemas.forEach((s) => ajv.addSchema(s));
  } else {
    options.strict = false;
    options.loadSchema = loadSchema;
    ajv = new Ajv(options);
  }

  addFormats(ajv);
  if (ajv.addKeyword) {
    ajv.addKeyword('x-gtm-clear');
  }
  ajvKeywords(ajv);

  return ajv;
}

/**
 * Creates a validation function for a given set of JSON schemas.
 *
 * @param {object[]} schemas An array of all JSON schemas.
 * @param {object} mainSchema The main JSON schema to validate against.
 * @returns {function(object): {valid: boolean, errors: object[]}} A function that takes data and returns a validation result.
 */
export async function createValidator(schemas, mainSchema, schemaPath) {
  if (!mainSchema) {
    mainSchema = schemas;
    schemas = [mainSchema];
  }
  const ajv = createAjvInstance(schemas, mainSchema, schemaPath);

  let validate;
  if (mainSchema?.$schema?.includes('draft-04')) {
    validate = mainSchema['$id']
      ? ajv.getSchema(mainSchema['$id'])
      : ajv.compile(mainSchema);
  } else if (ajv.compileAsync) {
    validate = await ajv.compileAsync(mainSchema);
  } else {
    validate = mainSchema['$id']
      ? ajv.getSchema(mainSchema['$id'])
      : ajv.compile(mainSchema);
  }

  if (!validate) {
    throw new Error(
      `Could not compile schema or find compiled schema for ${
        mainSchema['$id'] || 'main schema'
      }`,
    );
  }

  return (data) => {
    const valid = validate(data);
    if (!valid) {
      return { valid: false, errors: validate.errors };
    }
    return { valid: true, errors: [] };
  };
}

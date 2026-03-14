const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const RefParser = require('@apidevtools/json-schema-ref-parser');
const mergeAllOf = require('json-schema-merge-allof');
const {
  visitSchemaPropertyEntries,
} = require('../helpers/schemaTraversal.cjs');

const logger = {
  _isQuiet: false,
  _isJson: false,
  setup: function (isJson, isQuiet) {
    this._isQuiet = isQuiet;
    this._isJson = isJson;
  },
  log: function (...args) {
    if (!this._isQuiet && !this._isJson) {
      console.log(...args);
    }
  },
  error: function (...args) {
    if (!this._isQuiet) {
      console.error(...args);
    }
  },
};

function assertGtmCliAvailable() {
  try {
    execSync('gtm --version', { stdio: 'pipe' });
  } catch (error) {
    throw new Error(
      'GTM CLI is not installed or not available in PATH. Install it with "npm install --save-optional @owntag/gtm-cli" (or "npm install -g @owntag/gtm-cli").',
    );
  }
}

function safeJsonParse(cliOutput) {
  if (!cliOutput) return null;
  const arrayStartIndex = cliOutput.indexOf('[');
  const arrayEndIndex = cliOutput.lastIndexOf(']');
  if (arrayStartIndex !== -1 && arrayEndIndex !== -1) {
    const jsonString = cliOutput.substring(arrayStartIndex, arrayEndIndex + 1);
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  }
  const objStartIndex = cliOutput.indexOf('{');
  const objEndIndex = cliOutput.lastIndexOf('}');
  if (objStartIndex !== -1 && objEndIndex !== -1) {
    const jsonString = cliOutput.substring(objStartIndex, objEndIndex + 1);
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getLatestSchemaPath(siteDir = '.') {
  const versionsJsonPath = path.join(siteDir, 'versions.json');
  const schemasBasePath = path.join(siteDir, 'static', 'schemas');
  if (fs.existsSync(versionsJsonPath)) {
    const versions = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf-8'));
    if (versions.length > 0) return path.join(schemasBasePath, versions[0]);
  }
  const nextVersionPath = path.join(schemasBasePath, 'next');
  if (fs.existsSync(nextVersionPath)) return nextVersionPath;
  return schemasBasePath;
}

function findJsonFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findJsonFiles(filePath));
    } else if (path.extname(filePath) === '.json') {
      results.push(filePath);
    }
  });
  return results;
}

function isRootTrackingSchema(schema) {
  return Boolean(schema?.properties?.event || schema?.['x-tracking-targets']);
}

function parseSchema(schema, options, prefix = '') {
  const variables = [];

  visitSchemaPropertyEntries(
    schema,
    (property, context) => {
      variables.push({
        name: context.name,
        description: property.description,
        type: property.type,
      });
    },
    {
      prefix,
      skipArraySubProperties: options.skipArraySubProperties,
    },
  );

  return variables;
}

function shouldIncludeSchemaForGtm(schema) {
  if (!isRootTrackingSchema(schema)) {
    return false;
  }

  const trackingTargets = schema?.['x-tracking-targets'];

  return (
    Array.isArray(trackingTargets) &&
    trackingTargets.includes('web-datalayer-js')
  );
}

async function getVariablesFromSchemas(
  schemaPath,
  { skipArraySubProperties = false },
) {
  const allVariables = new Map();
  const jsonFiles = findJsonFiles(schemaPath);

  for (const file of jsonFiles) {
    try {
      let schema = await RefParser.bundle(file);
      if (!shouldIncludeSchemaForGtm(schema)) {
        continue;
      }
      schema = mergeAllOf(schema);
      const fileVariables = parseSchema(schema, { skipArraySubProperties });
      for (const variable of fileVariables) {
        if (!allVariables.has(variable.name)) {
          allVariables.set(variable.name, variable);
        }
      }
    } catch (e) {
      logger.error(`Error processing schema ${file}:`, e);
    }
  }
  return Array.from(allVariables.values());
}

function getGtmVariables() {
  logger.log('Fetching existing GTM variables...');
  const gtmVariablesOutput = execSync(
    'gtm variables list -o json --quiet',
  ).toString();
  return safeJsonParse(gtmVariablesOutput) || [];
}

function getVariablesToCreate(schemaVariables, gtmVariables) {
  const gtmVarMap = new Map();
  for (const gtmVar of gtmVariables) {
    const nameParam = gtmVar.parameter?.find((p) => p.key === 'name');
    if (gtmVar.type === 'v' && nameParam?.value) {
      gtmVarMap.set(nameParam.value, gtmVar);
    }
  }
  return schemaVariables.filter((sv) => !gtmVarMap.has(sv.name));
}

function getVariablesToDelete(schemaVariables, gtmVariables) {
  const schemaVarMap = new Map(schemaVariables.map((v) => [v.name, v]));
  return gtmVariables.filter((gv) => {
    const nameParam = gv.parameter?.find((p) => p.key === 'name');
    return (
      gv.type === 'v' &&
      nameParam?.value &&
      !schemaVarMap.has(nameParam.value) &&
      gv.name.startsWith('DLV -')
    );
  });
}

function createGtmVariables(variablesToCreate) {
  logger.log(`Found ${variablesToCreate.length} variables to create.`);
  for (const v of variablesToCreate) {
    const isSchemaVar = v.name === '$schema';
    const name = `DLV - ${v.name.replace(/\$/g, '\\$')}`;
    const notes = isSchemaVar
      ? `References the '$schema' property. ${(v.description || '').replace(
          /'/g,
          '`',
        )}`
      : (v.description || '').replace(/'/g, '`');

    const config = {
      notes,
      parameter: [
        { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
        { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
        { type: 'TEMPLATE', key: 'name', value: v.name },
      ],
    };
    const command = `gtm variables create --name "${name}" --type v --config '${JSON.stringify(
      config,
    )}' --quiet`;
    logger.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
  }
  return variablesToCreate.map((v) => v.name);
}

function deleteGtmVariables(variablesToDelete) {
  logger.log(`Found ${variablesToDelete.length} variables to delete.`);
  for (const v of variablesToDelete) {
    const command = `gtm variables delete --variable-id ${v.variableId} --force --quiet`;
    logger.log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
  }
  return variablesToDelete.map(
    (v) => v.parameter.find((p) => p.key === 'name').value,
  );
}

async function syncGtmVariables(
  schemaVariables,
  { skipArraySubProperties = false },
) {
  const gtmVariables = getGtmVariables();

  let finalSchemaVariables = schemaVariables;
  if (skipArraySubProperties) {
    finalSchemaVariables = schemaVariables.filter(
      (v) => !v.name.includes('.0.'),
    );
  }

  const toCreate = getVariablesToCreate(finalSchemaVariables, gtmVariables);
  const toDelete = getVariablesToDelete(finalSchemaVariables, gtmVariables);
  const inSync = schemaVariables.filter(
    (s) => !toCreate.find((c) => c.name === s.name),
  );

  const created = createGtmVariables(toCreate);
  const deleted = deleteGtmVariables(toDelete);

  logger.log('GTM variable synchronization complete.');
  return {
    created,
    deleted,
    inSync: inSync.map((v) => v.name),
  };
}

async function setupGtmWorkspace() {
  const branchName =
    process.env.GTM_WORKSPACE_BRANCH ||
    execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const workspaceName = `feat/${branchName.replace(/[^a-zA-Z0-9]/g, '-')}`;

  logger.log('Listing GTM workspaces to find and delete existing...');
  const workspacesOutput = execSync(
    'gtm workspaces list -o json --quiet',
  ).toString();
  const workspaces = safeJsonParse(workspacesOutput) || [];
  const existingWorkspace = workspaces.find((w) => w.name === workspaceName);

  if (existingWorkspace) {
    logger.log(
      `Found and deleting existing GTM workspace named "${workspaceName}" with ID: ${existingWorkspace.workspaceId}`,
    );
    execSync(
      `gtm workspaces delete --workspace-id ${existingWorkspace.workspaceId} --force --quiet`,
    );
  }

  logger.log(`Creating GTM workspace named "${workspaceName}"...`);
  const createWorkspaceOutput = execSync(
    `gtm workspaces create --name "${workspaceName}" -o json --quiet`,
  ).toString();
  const newWorkspace = safeJsonParse(createWorkspaceOutput);
  const workspaceId =
    newWorkspace &&
    (Array.isArray(newWorkspace)
      ? newWorkspace[0]?.workspaceId
      : newWorkspace.workspaceId);

  if (!workspaceId) {
    throw new Error('Failed to create GTM workspace or parse its ID.');
  }
  logger.log(`Successfully created workspace with ID: ${workspaceId}`);

  execSync(`gtm config set defaultWorkspaceId ${workspaceId}`);
  logger.log(`Set default workspace to ${workspaceId}`);
  return { workspaceName, workspaceId };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const pathArg = args.find((arg) => arg.startsWith('--path=')) || '';
  const siteDir = pathArg.split('=')[1] || '.';
  return {
    isJson: args.includes('--json'),
    isQuiet: args.includes('--quiet'),
    skipArraySubProperties: args.includes('--skip-array-sub-properties'),
    siteDir,
  };
}

async function main(argv, deps) {
  try {
    const {
      setupGtmWorkspace: setup,
      getLatestSchemaPath: getPath,
      getVariablesFromSchemas: getVars,
      syncGtmVariables: sync,
      assertGtmCliAvailable: assertCli = assertGtmCliAvailable,
      logger: log,
      parseArgs: parse,
      process: proc,
    } = deps;
    const { isJson, isQuiet, skipArraySubProperties, siteDir } = parse(argv);
    log.setup(isJson, isQuiet);

    log.log('Starting GTM variable synchronization script...');
    assertCli();

    const { workspaceName, workspaceId } = await setup();

    const schemaPath = getPath(siteDir);
    if (!fs.existsSync(schemaPath)) {
      throw new Error(
        `Schema directory not found: ${schemaPath}. Use --path=<siteDir> to point to your Docusaurus project root.`,
      );
    }
    log.log(`Scanning for schemas in: ${schemaPath}`);
    const schemaVariables = await getVars(schemaPath, {
      skipArraySubProperties,
    });
    if (schemaVariables.length === 0) {
      throw new Error(
        `No schema variables found in ${schemaPath}. Aborting to avoid deleting existing GTM variables.`,
      );
    }
    log.log(`Found ${schemaVariables.length} variables defined in schemas.`);

    const summary = await sync(schemaVariables, { skipArraySubProperties });

    if (isJson) {
      console.log(
        JSON.stringify(
          { workspace: { workspaceName, workspaceId }, ...summary },
          null,
          2,
        ),
      );
    } else {
      log.log('Synchronization successful!');
      log.log(
        `All changes applied in GTM workspace: "${workspaceName}" (ID: ${workspaceId})`,
      );
    }
  } catch (error) {
    logger.error('An error occurred during GTM synchronization:');
    logger.error(error.message);
    if (deps.process && typeof deps.process.exit === 'function') {
      deps.process.exit(1);
    } else {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const dependencies = {
    setupGtmWorkspace,
    getLatestSchemaPath,
    getVariablesFromSchemas,
    syncGtmVariables,
    assertGtmCliAvailable,
    logger,
    parseArgs,
    process,
  };
  main(process.argv, dependencies);
}

module.exports = {
  getLatestSchemaPath,
  getVariablesFromSchemas,
  syncGtmVariables,
  main,
  getVariablesToCreate,
  getVariablesToDelete,
  createGtmVariables,
  deleteGtmVariables,
  parseSchema,
  shouldIncludeSchemaForGtm,
  findJsonFiles,
  safeJsonParse,
  logger,
  parseArgs,
  assertGtmCliAvailable,
  setupGtmWorkspace,
};

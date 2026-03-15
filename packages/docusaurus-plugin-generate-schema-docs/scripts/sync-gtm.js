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
      schema = mergeAllOf(schema);
      if (!shouldIncludeSchemaForGtm(schema)) {
        continue;
      }
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

function getGtmTags() {
  logger.log('Fetching existing GTM tags...');
  const gtmTagsOutput = execSync('gtm tags list -o json --quiet').toString();
  return safeJsonParse(gtmTagsOutput) || [];
}

function getGtmTriggers() {
  logger.log('Fetching existing GTM triggers...');
  const gtmTriggersOutput = execSync(
    'gtm triggers list -o json --quiet',
  ).toString();
  return safeJsonParse(gtmTriggersOutput) || [];
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

function collectTemplateReferencesFromParameter(parameter, references) {
  if (!parameter || typeof parameter !== 'object') {
    return;
  }

  if (typeof parameter.value === 'string') {
    const matches = parameter.value.matchAll(/\{\{([^}]+)\}\}/g);
    for (const match of matches) {
      references.add(match[1].trim());
    }
  }

  if (Array.isArray(parameter.list)) {
    parameter.list.forEach((nestedParameter) => {
      collectTemplateReferencesFromParameter(nestedParameter, references);
    });
  }

  if (Array.isArray(parameter.map)) {
    parameter.map.forEach((nestedParameter) => {
      collectTemplateReferencesFromParameter(nestedParameter, references);
    });
  }
}

function collectVariableReferencesFromEntity(entity, entityType, references) {
  if (!Array.isArray(entity?.parameter)) {
    return;
  }

  const templateReferences = new Set();
  entity.parameter.forEach((parameter) => {
    collectTemplateReferencesFromParameter(parameter, templateReferences);
  });

  templateReferences.forEach((variableName) => {
    if (!references.has(variableName)) {
      references.set(variableName, []);
    }

    references.get(variableName).push({
      type: entityType,
      id: entity.tagId || entity.triggerId || entity.variableId,
      name: entity.name,
    });
  });
}

function stripVariableReferenceFromValue(value, variableName) {
  if (typeof value !== 'string') {
    return value;
  }

  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactReferencePattern = new RegExp(
    `^\\{\\{\\s*${escapedName}\\s*\\}\\}$`,
  );

  if (exactReferencePattern.test(value)) {
    return ' ';
  }

  return value.replace(
    new RegExp(`\\{\\{\\s*${escapedName}\\s*\\}\\}`, 'g'),
    '',
  );
}

function stripVariableReferenceFromParameter(parameter, variableName) {
  if (!parameter || typeof parameter !== 'object') {
    return parameter;
  }

  const updatedParameter = { ...parameter };

  if (typeof updatedParameter.value === 'string') {
    updatedParameter.value = stripVariableReferenceFromValue(
      updatedParameter.value,
      variableName,
    );
  }

  if (Array.isArray(updatedParameter.list)) {
    updatedParameter.list = updatedParameter.list.map((nestedParameter) =>
      stripVariableReferenceFromParameter(nestedParameter, variableName),
    );
  }

  if (Array.isArray(updatedParameter.map)) {
    updatedParameter.map = updatedParameter.map.map((nestedParameter) =>
      stripVariableReferenceFromParameter(nestedParameter, variableName),
    );
  }

  return updatedParameter;
}

function stripVariableReferenceFromEntity(entity, variableName) {
  if (!Array.isArray(entity?.parameter)) {
    return entity;
  }

  return {
    ...entity,
    parameter: entity.parameter.map((parameter) =>
      stripVariableReferenceFromParameter(parameter, variableName),
    ),
  };
}

function getReferencedVariableNames(tags = [], triggers = [], variables = []) {
  return new Set(getVariableReferences(tags, triggers, variables).keys());
}

function getVariableReferences(tags = [], triggers = [], variables = []) {
  const references = new Map();

  tags.forEach((tag) => {
    collectVariableReferencesFromEntity(tag, 'tag', references);
  });

  triggers.forEach((trigger) => {
    collectVariableReferencesFromEntity(trigger, 'trigger', references);
  });

  variables.forEach((variable) => {
    collectVariableReferencesFromEntity(variable, 'variable', references);
  });

  return references;
}

function getVariablesToDelete(
  schemaVariables,
  gtmVariables,
  referencedVariableNames = new Set(),
) {
  const schemaVarMap = new Map(schemaVariables.map((v) => [v.name, v]));
  return gtmVariables.filter((gv) => {
    const nameParam = gv.parameter?.find((p) => p.key === 'name');
    return (
      gv.type === 'v' &&
      nameParam?.value &&
      !referencedVariableNames.has(gv.name) &&
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

function updateGtmEntity(entityType, entity) {
  const entityTypeToCommand = {
    tag: {
      idFlag: '--tag-id',
      command: 'gtm tags update',
      id: entity.tagId,
    },
    trigger: {
      idFlag: '--trigger-id',
      command: 'gtm triggers update',
      id: entity.triggerId,
    },
    variable: {
      idFlag: '--variable-id',
      command: 'gtm variables update',
      id: entity.variableId,
    },
  };

  const commandConfig = entityTypeToCommand[entityType];
  if (!commandConfig) {
    throw new Error(`Unsupported GTM entity type: ${entityType}`);
  }

  const args = [
    commandConfig.command,
    commandConfig.idFlag,
    commandConfig.id,
    '--name',
    `"${entity.name}"`,
    '--config',
    `'${JSON.stringify({
      type: entity.type,
      parameter: entity.parameter,
    })}'`,
  ];

  if (entity.fingerprint) {
    args.push('--fingerprint', entity.fingerprint);
  }

  if (entityType === 'tag' && entity.paused !== undefined) {
    args.push('--paused', String(entity.paused));
  }

  args.push('--quiet');

  const command = args.join(' ');
  logger.log(`Executing: ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function removeVariableReferences(
  blockedDeletes,
  { gtmTags = [], gtmTriggers = [], gtmVariables = [] } = {},
) {
  const entitiesByKey = new Map();
  const sourceEntities = {
    tag: gtmTags,
    trigger: gtmTriggers,
    variable: gtmVariables,
  };
  const removedReferences = [];

  for (const blockedDelete of blockedDeletes) {
    const fullVariableName = `DLV - ${blockedDelete.name}`;
    removedReferences.push({
      variableName: blockedDelete.name,
      referenceCount: blockedDelete.references.length,
      entities: blockedDelete.references,
    });

    for (const reference of blockedDelete.references) {
      const entityKey = `${reference.type}:${reference.id}`;

      if (!entitiesByKey.has(entityKey)) {
        const sourceEntity = sourceEntities[reference.type]?.find((entity) => {
          const entityId =
            entity.tagId || entity.triggerId || entity.variableId;
          return entityId === reference.id;
        });

        if (!sourceEntity) {
          throw new Error(
            `Could not find ${reference.type} ${reference.id} while removing references to ${fullVariableName}.`,
          );
        }

        entitiesByKey.set(entityKey, {
          type: reference.type,
          entity: sourceEntity,
        });
      }

      const updatedEntry = entitiesByKey.get(entityKey);
      updatedEntry.entity = stripVariableReferenceFromEntity(
        updatedEntry.entity,
        fullVariableName,
      );
    }
  }

  for (const { type, entity } of entitiesByKey.values()) {
    updateGtmEntity(type, entity);
  }

  return removedReferences;
}

async function syncGtmVariables(
  schemaVariables,
  { skipArraySubProperties = false, removeReferences = false } = {},
) {
  const gtmVariables = getGtmVariables();
  const gtmTags = getGtmTags();
  const gtmTriggers = getGtmTriggers();
  const variableReferences = getVariableReferences(
    gtmTags,
    gtmTriggers,
    gtmVariables,
  );

  let finalSchemaVariables = schemaVariables;
  if (skipArraySubProperties) {
    finalSchemaVariables = schemaVariables.filter(
      (v) => !v.name.includes('.0.'),
    );
  }

  const toCreate = getVariablesToCreate(finalSchemaVariables, gtmVariables);
  const toDelete = getVariablesToDelete(
    finalSchemaVariables,
    gtmVariables,
    new Set(variableReferences.keys()),
  );
  const blockedDeletes = gtmVariables
    .filter((gv) => {
      const nameParam = gv.parameter?.find((p) => p.key === 'name');
      return (
        gv.type === 'v' &&
        nameParam?.value &&
        !finalSchemaVariables.find((sv) => sv.name === nameParam.value) &&
        gv.name.startsWith('DLV -') &&
        variableReferences.has(gv.name)
      );
    })
    .map((gv) => ({
      name: gv.parameter.find((p) => p.key === 'name').value,
      variableId: gv.variableId,
      references: variableReferences.get(gv.name),
    }));
  const inSync = schemaVariables.filter(
    (s) => !toCreate.find((c) => c.name === s.name),
  );
  const removedReferences = removeReferences
    ? removeVariableReferences(blockedDeletes, {
        gtmTags,
        gtmTriggers,
        gtmVariables,
      })
    : [];
  const deletableBlockedVariables = removeReferences
    ? blockedDeletes.map((blockedDelete) =>
        gtmVariables.find(
          (variable) => variable.variableId === blockedDelete.variableId,
        ),
      )
    : [];
  const finalBlockedDeletes = removeReferences ? [] : blockedDeletes;

  const created = createGtmVariables(toCreate);
  const deleted = deleteGtmVariables([
    ...toDelete,
    ...deletableBlockedVariables,
  ]);

  logger.log('GTM variable synchronization complete.');
  return {
    created,
    deleted,
    removedReferences,
    blockedDeletes: finalBlockedDeletes,
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
    removeReferences: args.includes('--remove-references'),
    skipArraySubProperties: args.includes('--skip-array-sub-properties'),
    siteDir,
  };
}

function formatReference(reference) {
  return `${reference.type} "${reference.name}" (${reference.id})`;
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
    const {
      isJson,
      isQuiet,
      removeReferences,
      skipArraySubProperties,
      siteDir,
    } = parse(argv);
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

    const summary = await sync(schemaVariables, {
      skipArraySubProperties,
      removeReferences,
    });

    if (isJson) {
      console.log(
        JSON.stringify(
          { workspace: { workspaceName, workspaceId }, ...summary },
          null,
          2,
        ),
      );
    } else {
      if (summary.removedReferences?.length > 0) {
        log.log(
          `Removed ${summary.removedReferences.length} referenced variable usages before deletion:`,
        );
        for (const removedReference of summary.removedReferences) {
          const references = removedReference.entities
            .map(formatReference)
            .join(', ');
          log.log(`- ${removedReference.variableName} from ${references}`);
        }
      }
      if (summary.blockedDeletes?.length > 0) {
        log.log(
          `Skipped deleting ${summary.blockedDeletes.length} GTM variables because they are still referenced:`,
        );
        for (const blockedDelete of summary.blockedDeletes) {
          const references = (blockedDelete.references || [])
            .map(formatReference)
            .join(', ');
          log.log(
            `- ${blockedDelete.name} (ID: ${blockedDelete.variableId}) referenced by ${references}`,
          );
        }
      }
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
  getVariableReferences,
  getReferencedVariableNames,
  stripVariableReferenceFromEntity,
  stripVariableReferenceFromParameter,
  stripVariableReferenceFromValue,
  removeVariableReferences,
  updateGtmEntity,
  getGtmTags,
  getGtmTriggers,
  getGtmVariables,
  createGtmVariables,
  deleteGtmVariables,
  parseSchema,
  shouldIncludeSchemaForGtm,
  findJsonFiles,
  safeJsonParse,
  formatReference,
  logger,
  parseArgs,
  assertGtmCliAvailable,
  setupGtmWorkspace,
};

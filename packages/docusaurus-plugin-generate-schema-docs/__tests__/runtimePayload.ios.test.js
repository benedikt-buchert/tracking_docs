const { generateSnippetForTarget } = require('../helpers/snippetTargets');
const { PAYLOAD_CONTRACTS } = require('../test-data/payloadContracts');
const IOS_CONTRACTS = PAYLOAD_CONTRACTS.filter(
  (contract) => contract.expected?.firebase,
);

function stripTrailingComma(value) {
  return value.replace(/,+$/, '').trim();
}

function splitPair(line) {
  const match = line.match(/^(.+?):\s*(.+)$/);
  if (!match) {
    throw new Error(`Cannot parse key/value line: ${line}`);
  }
  return {
    keyToken: stripTrailingComma(match[1].trim()),
    valueToken: stripTrailingComma(match[2].trim()),
  };
}

function toSnakeCaseFromPascal(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function resolveEventToken(token) {
  if (token.startsWith('"') && token.endsWith('"')) return JSON.parse(token);
  if (token.startsWith('@"') && token.endsWith('"')) {
    return JSON.parse(token.slice(1));
  }
  if (token.startsWith('AnalyticsEvent')) {
    return toSnakeCaseFromPascal(token.slice('AnalyticsEvent'.length));
  }
  if (token.startsWith('kFIREvent')) {
    return toSnakeCaseFromPascal(token.slice('kFIREvent'.length));
  }
  throw new Error(`Unsupported event token: ${token}`);
}

function resolveParamToken(token) {
  if (token.startsWith('"') && token.endsWith('"')) return JSON.parse(token);
  if (token.startsWith('@"') && token.endsWith('"')) {
    return JSON.parse(token.slice(1));
  }
  if (token === 'AnalyticsParameterAdNetworkClickID') return 'aclid';
  if (token === 'kFIRParameterAdNetworkClickID') return 'aclid';
  if (token.startsWith('AnalyticsParameter')) {
    return toSnakeCaseFromPascal(token.slice('AnalyticsParameter'.length));
  }
  if (token.startsWith('kFIRParameter')) {
    return toSnakeCaseFromPascal(token.slice('kFIRParameter'.length));
  }
  throw new Error(`Unsupported parameter token: ${token}`);
}

function resolveUserPropertyToken(token) {
  if (token.startsWith('"') && token.endsWith('"')) return JSON.parse(token);
  if (token.startsWith('@"') && token.endsWith('"')) {
    return JSON.parse(token.slice(1));
  }
  if (token === 'AnalyticsUserPropertySignUpMethod') return 'sign_up_method';
  if (token === 'kFIRUserPropertySignUpMethod') return 'sign_up_method';
  if (token === 'AnalyticsUserPropertyAllowAdPersonalizationSignals') {
    return 'allow_personalized_ads';
  }
  if (token === 'kFIRUserPropertyAllowAdPersonalizationSignals') {
    return 'allow_personalized_ads';
  }
  throw new Error(`Unsupported user property token: ${token}`);
}

function resolveSwiftValue(token) {
  const value = token.trim();
  if (value === 'nil') return null;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  throw new Error(`Unsupported Swift value token: ${value}`);
}

function resolveObjcValue(token) {
  const value = token.trim();
  if (value === 'nil') return null;
  if (value.startsWith('@"') && value.endsWith('"')) {
    return JSON.parse(value.slice(1));
  }
  const numberMatch = value.match(/^@\((-?\d+(?:\.\d+)?)\)$/);
  if (numberMatch) return Number(numberMatch[1]);
  throw new Error(`Unsupported Obj-C value token: ${value}`);
}

function parseSwiftDictionary(lines, startIndex) {
  const payload = {};
  let idx = startIndex + 1;
  while (idx < lines.length && lines[idx].trim() !== ']') {
    const line = lines[idx].trim();
    if (line.length > 0) {
      const { keyToken, valueToken } = splitPair(line);
      payload[resolveParamToken(keyToken)] = resolveSwiftValue(valueToken);
    }
    idx += 1;
  }
  return { payload, endIndex: idx };
}

function parseObjcDictionary(lines, startIndex) {
  const payload = {};
  let idx = startIndex + 1;
  while (idx < lines.length && lines[idx].trim() !== '} mutableCopy];') {
    const line = lines[idx].trim();
    if (line.length > 0) {
      const { keyToken, valueToken } = splitPair(line);
      payload[resolveParamToken(keyToken)] = resolveObjcValue(valueToken);
    }
    idx += 1;
  }
  return { payload, endIndex: idx };
}

function parseSwiftRuntimePayload(snippet) {
  const lines = snippet.split('\n');
  const itemsByName = {};
  const userProperties = {};
  let eventName = null;
  let parameters = null;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx].trim();
    if (!line) continue;

    const itemStart = line.match(/^var (item\d+): \[String: Any\] = \[$/);
    if (itemStart) {
      const parsed = parseSwiftDictionary(lines, idx);
      itemsByName[itemStart[1]] = parsed.payload;
      idx = parsed.endIndex;
      continue;
    }

    const userPropertyMatch = line.match(
      /^Analytics\.setUserProperty\((.+), forName: (.+)\)$/,
    );
    if (userPropertyMatch) {
      const value = resolveSwiftValue(userPropertyMatch[1].trim());
      const key = resolveUserPropertyToken(userPropertyMatch[2].trim());
      userProperties[key] = value === null ? null : String(value);
      continue;
    }

    if (line === 'var eventParams: [String: Any] = [') {
      const parsed = parseSwiftDictionary(lines, idx);
      parameters = parsed.payload;
      idx = parsed.endIndex;
      continue;
    }

    const itemsAssignmentMatch = line.match(/^eventParams\[(.+)\] = \[(.+)\]$/);
    if (itemsAssignmentMatch) {
      const key = resolveParamToken(itemsAssignmentMatch[1].trim());
      const names = itemsAssignmentMatch[2]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      parameters[key] = names.map((name) => itemsByName[name]);
      continue;
    }

    const logEventMatch = line.match(
      /^Analytics\.logEvent\((.+), parameters: (.+)\)$/,
    );
    if (logEventMatch) {
      eventName = resolveEventToken(logEventMatch[1].trim());
      if (logEventMatch[2].trim() === 'nil') {
        parameters = null;
      }
      continue;
    }
  }

  return { eventName, parameters, userProperties };
}

function parseObjcRuntimePayload(snippet) {
  const lines = snippet.split('\n');
  const itemsByName = {};
  const userProperties = {};
  let eventName = null;
  let parameters = null;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx].trim();
    if (!line) continue;

    const itemStart = line.match(/^NSMutableDictionary \*(item\d+) = \[@\{$/);
    if (itemStart) {
      const parsed = parseObjcDictionary(lines, idx);
      itemsByName[itemStart[1]] = parsed.payload;
      idx = parsed.endIndex;
      continue;
    }

    const userPropertyMatch = line.match(
      /^\[FIRAnalytics setUserPropertyString:(.+) forName:(.+)\];$/,
    );
    if (userPropertyMatch) {
      const value = resolveObjcValue(userPropertyMatch[1].trim());
      const key = resolveUserPropertyToken(userPropertyMatch[2].trim());
      userProperties[key] = value === null ? null : String(value);
      continue;
    }

    if (line === 'NSMutableDictionary *eventParams = [@{') {
      const parsed = parseObjcDictionary(lines, idx);
      parameters = parsed.payload;
      idx = parsed.endIndex;
      continue;
    }

    const itemsAssignmentMatch = line.match(
      /^eventParams\[(.+)\] = @\[(.+)\];$/,
    );
    if (itemsAssignmentMatch) {
      const key = resolveParamToken(itemsAssignmentMatch[1].trim());
      const names = itemsAssignmentMatch[2]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      parameters[key] = names.map((name) => itemsByName[name]);
      continue;
    }

    const logEventMatch = line.match(
      /^\[FIRAnalytics logEventWithName:(.+) parameters:(.+)\];$/,
    );
    if (logEventMatch) {
      eventName = resolveEventToken(logEventMatch[1].trim());
      if (logEventMatch[2].trim() === 'nil') {
        parameters = null;
      }
      continue;
    }
  }

  return { eventName, parameters, userProperties };
}

function expectPayloadContract(parsed, expectedContract) {
  expect(parsed.eventName).toBe(expectedContract.eventName);
  expect(parsed.parameters || {}).toEqual(expectedContract.parameters || {});
  expect(parsed.userProperties || {}).toEqual(
    expectedContract.userProperties || {},
  );
}

describe('runtime payload contracts (ios)', () => {
  it.each(IOS_CONTRACTS)(
    'validates Swift runtime payload for $id ($class)',
    (contract) => {
      const snippet = generateSnippetForTarget({
        targetId: 'ios-firebase-swift-sdk',
        example: contract.example,
        schema: { properties: {} },
      });

      const parsed = parseSwiftRuntimePayload(snippet);
      expectPayloadContract(parsed, contract.expected.firebase);
    },
  );

  it.each(IOS_CONTRACTS)(
    'validates Obj-C runtime payload for $id ($class)',
    (contract) => {
      const snippet = generateSnippetForTarget({
        targetId: 'ios-firebase-objc-sdk',
        example: contract.example,
        schema: { properties: {} },
      });

      const parsed = parseObjcRuntimePayload(snippet);
      expectPayloadContract(parsed, contract.expected.firebase);
    },
  );
});

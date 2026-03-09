/* eslint jest/expect-expect: ["warn", { "assertFunctionNames": ["expect", "expectPayloadContract"] }] */
const { generateSnippetForTarget } = require('../helpers/snippetTargets');
const { PAYLOAD_CONTRACTS } = require('../test-data/payloadContracts');

const ANDROID_CONTRACTS = PAYLOAD_CONTRACTS.filter(
  (contract) => contract.expected?.firebase,
);

function upperSnakeToSnake(value) {
  return value.toLowerCase();
}

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  return value;
}

function resolveAndroidEventToken(token) {
  if (token.startsWith('"') && token.endsWith('"')) return JSON.parse(token);
  const match = token.match(/^FirebaseAnalytics\.Event\.([A-Z0-9_]+)$/);
  if (match) return upperSnakeToSnake(match[1]);
  throw new Error(`Unsupported Android event token: ${token}`);
}

function resolveAndroidParamToken(token) {
  if (token.startsWith('"') && token.endsWith('"')) return JSON.parse(token);
  const match = token.match(/^FirebaseAnalytics\.Param\.([A-Z0-9_]+)$/);
  if (match) return upperSnakeToSnake(match[1]);
  throw new Error(`Unsupported Android parameter token: ${token}`);
}

function resolveAndroidUserPropertyToken(token) {
  if (token.startsWith('"') && token.endsWith('"')) return JSON.parse(token);
  const match = token.match(/^FirebaseAnalytics\.UserProperty\.([A-Z0-9_]+)$/);
  if (!match)
    throw new Error(`Unsupported Android user property token: ${token}`);
  if (match[1] === 'ALLOW_AD_PERSONALIZATION_SIGNALS') {
    return 'allow_personalized_ads';
  }
  return upperSnakeToSnake(match[1]);
}

function resolveAndroidValue(token) {
  const value = token.trim();
  if (value === 'null') return null;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  const longMatch = value.match(/^(-?\d+)L$/);
  if (longMatch) return Number(longMatch[1]);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  throw new Error(`Unsupported Android value token: ${value}`);
}

function splitArgs(content) {
  let quote = null;
  let escaped = false;
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (let idx = 0; idx < content.length; idx += 1) {
    const char = content[idx];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') {
      roundDepth += 1;
      continue;
    }
    if (char === ')') {
      roundDepth -= 1;
      continue;
    }
    if (char === '[') {
      squareDepth += 1;
      continue;
    }
    if (char === ']') {
      squareDepth -= 1;
      continue;
    }
    if (char === '{') {
      curlyDepth += 1;
      continue;
    }
    if (char === '}') {
      curlyDepth -= 1;
      continue;
    }
    if (
      char === ',' &&
      roundDepth === 0 &&
      squareDepth === 0 &&
      curlyDepth === 0
    ) {
      return [content.slice(0, idx).trim(), content.slice(idx + 1).trim()];
    }
  }

  throw new Error(`Unable to split function arguments: ${content}`);
}

function parseKotlinRuntimePayload(snippet) {
  const lines = snippet.split('\n').map((line) => line.trim());
  const itemBundles = {};
  const userProperties = {};
  const eventParams = {};
  let eventName = null;
  let inLogEvent = false;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!line) continue;

    const itemStart = line.match(/^val (item\d+) = Bundle\(\)\.apply \{$/);
    if (itemStart) {
      const itemName = itemStart[1];
      itemBundles[itemName] = {};
      idx += 1;
      while (idx < lines.length && lines[idx] !== '}') {
        const putLine = lines[idx];
        const putMatch = putLine.match(/^put(?:String|Long|Double)\((.+)\)$/);
        if (!putMatch)
          throw new Error(`Unsupported Kotlin item line: ${putLine}`);
        const [keyToken, valueToken] = splitArgs(putMatch[1]);
        itemBundles[itemName][resolveAndroidParamToken(keyToken)] =
          resolveAndroidValue(valueToken);
        idx += 1;
      }
      continue;
    }

    const userMatch = line.match(
      /^firebaseAnalytics\.setUserProperty\((.+)\)$/,
    );
    if (userMatch) {
      const [keyToken, valueToken] = splitArgs(userMatch[1]);
      const key = resolveAndroidUserPropertyToken(keyToken);
      const value = resolveAndroidValue(valueToken);
      userProperties[key] = value === null ? null : String(value);
      continue;
    }

    const logStartMatch = line.match(
      /^firebaseAnalytics\.logEvent\((.+)\) \{$/,
    );
    if (logStartMatch) {
      eventName = resolveAndroidEventToken(logStartMatch[1].trim());
      inLogEvent = true;
      continue;
    }

    if (inLogEvent && line === '}') {
      inLogEvent = false;
      continue;
    }

    if (inLogEvent) {
      const paramMatch = line.match(/^param\((.+)\)$/);
      if (!paramMatch)
        throw new Error(`Unsupported Kotlin param line: ${line}`);
      const [keyToken, valueToken] = splitArgs(paramMatch[1]);
      const key = resolveAndroidParamToken(keyToken);
      const itemsMatch = valueToken.match(/^arrayOf\((.+)\)$/);
      if (itemsMatch) {
        const names = itemsMatch[1]
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);
        eventParams[key] = names.map((name) => itemBundles[name]);
      } else {
        eventParams[key] = resolveAndroidValue(valueToken);
      }
    }
  }

  return { eventName, parameters: eventParams, userProperties };
}

function parseJavaRuntimePayload(snippet) {
  const lines = snippet.split('\n').map((line) => line.trim());
  const bundles = {};
  const userProperties = {};
  let eventName = null;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!line) continue;

    const bundleStart = line.match(/^Bundle (\w+) = new Bundle\(\);$/);
    if (bundleStart) {
      bundles[bundleStart[1]] = {};
      continue;
    }

    const putMatch = line.match(/^(\w+)\.put(?:String|Long|Double)\((.+)\);$/);
    if (putMatch) {
      const bundleName = putMatch[1];
      const [keyToken, valueToken] = splitArgs(putMatch[2]);
      bundles[bundleName][resolveAndroidParamToken(keyToken)] =
        resolveAndroidValue(valueToken);
      continue;
    }

    const parcelableMatch = line.match(
      /^eventParams\.putParcelableArray\((.+), new Parcelable\[\]\{(.+)\}\);$/,
    );
    if (parcelableMatch) {
      const key = resolveAndroidParamToken(parcelableMatch[1].trim());
      const names = parcelableMatch[2]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      bundles.eventParams[key] = names.map((name) => bundles[name]);
      continue;
    }

    const userMatch = line.match(
      /^mFirebaseAnalytics\.setUserProperty\((.+)\);$/,
    );
    if (userMatch) {
      const [keyToken, valueToken] = splitArgs(userMatch[1]);
      const key = resolveAndroidUserPropertyToken(keyToken);
      const value = resolveAndroidValue(valueToken);
      userProperties[key] = value === null ? null : String(value);
      continue;
    }

    const logMatch = line.match(
      /^mFirebaseAnalytics\.logEvent\((.+), eventParams\);$/,
    );
    if (logMatch) {
      eventName = resolveAndroidEventToken(logMatch[1].trim());
    }
  }

  return { eventName, parameters: bundles.eventParams || {}, userProperties };
}

function expectPayloadContract(parsed, expectedContract) {
  expect(parsed.eventName).toBe(expectedContract.eventName);
  expect(parsed.parameters || {}).toEqual(expectedContract.parameters || {});
  expect(parsed.userProperties || {}).toEqual(
    expectedContract.userProperties || {},
  );
}

describe('runtime payload contracts (android)', () => {
  it.each(ANDROID_CONTRACTS)(
    'validates Kotlin runtime payload for $id ($class)',
    (contract) => {
      const snippet = generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: contract.example,
        schema: { properties: {} },
      });

      const parsed = parseKotlinRuntimePayload(snippet);
      expectPayloadContract(parsed, contract.expected.firebase);
    },
  );

  it.each(ANDROID_CONTRACTS)(
    'validates Java runtime payload for $id ($class)',
    (contract) => {
      const snippet = generateSnippetForTarget({
        targetId: 'android-firebase-java-sdk',
        example: contract.example,
        schema: { properties: {} },
      });

      const parsed = parseJavaRuntimePayload(snippet);
      expectPayloadContract(parsed, contract.expected.firebase);
    },
  );
});

export const DEFAULT_SNIPPET_TARGET_ID = 'web-datalayer-js';
export const FIREBASE_FALLBACK_WARNING =
  'WARNING: Non-primitive values were serialized to JSON string for Firebase compatibility.';
export const FIREBASE_SNIPPET_SOURCES = [
  {
    id: 'firebase-analytics-android-events',
    url: 'https://firebase.google.com/docs/analytics/android/events',
    reviewedAt: '2026-03-05',
  },
  {
    id: 'firebase-analytics-ios-events',
    url: 'https://firebase.google.com/docs/analytics/ios/events',
    reviewedAt: '2026-03-05',
  },
];

export const findClearableProperties = (schema) => {
  if (!schema || !schema.properties) return [];

  return Object.entries(schema.properties)
    .filter(([, definition]) => definition['x-gtm-clear'] === true)
    .map(([key]) => key);
};

function generateWebDataLayerSnippet({
  example,
  schema,
  config = {},
  dataLayerName,
}) {
  const resolvedDataLayerName =
    dataLayerName || config.dataLayerName || 'dataLayer';
  const clearableProperties = findClearableProperties(schema || {});
  const propertiesToClear = clearableProperties.filter(
    (prop) => prop in example,
  );

  let codeSnippet = '';
  if (propertiesToClear.length > 0) {
    const resetObject = {};
    propertiesToClear.forEach((prop) => {
      resetObject[prop] = null;
    });
    codeSnippet += `window.${resolvedDataLayerName}.push(${JSON.stringify(
      resetObject,
      null,
      2,
    )});\n`;
  }

  codeSnippet += `window.${resolvedDataLayerName}.push(${JSON.stringify(
    example,
    null,
    2,
  )});`;

  return codeSnippet;
}

function resolveFirebaseEvent(example) {
  const eventName =
    typeof example?.event === 'string' && example.event.trim().length > 0
      ? example.event.trim()
      : 'custom_event';

  const params = [];
  Object.entries(example || {}).forEach(([key, value]) => {
    if (key === 'event' || value === undefined) return;

    if (typeof value === 'string') {
      params.push({ key, kind: 'string', value });
      return;
    }
    if (typeof value === 'number') {
      if (Number.isFinite(value) && Number.isInteger(value)) {
        params.push({ key, kind: 'long', value });
      } else {
        params.push({ key, kind: 'double', value });
      }
      return;
    }
    if (typeof value === 'boolean') {
      params.push({ key, kind: 'long', value: value ? 1 : 0 });
      return;
    }
    if (value === null) {
      params.push({
        key,
        kind: 'string',
        value: 'null',
        usedJsonFallback: true,
      });
      return;
    }

    params.push({
      key,
      kind: 'string',
      value: JSON.stringify(value),
      usedJsonFallback: true,
    });
  });

  return {
    eventName,
    params,
    usedFallback: params.some((p) => p.usedJsonFallback),
  };
}

function generateAndroidKotlinFirebaseSnippet({ example }) {
  const { eventName, params, usedFallback } = resolveFirebaseEvent(example);
  const lines = [];

  if (usedFallback) {
    lines.push(`// ${FIREBASE_FALLBACK_WARNING}`);
  }

  lines.push(`firebaseAnalytics.logEvent(${JSON.stringify(eventName)}) {`);
  params.forEach((param) => {
    if (param.kind === 'string') {
      lines.push(
        `  param(${JSON.stringify(param.key)}, ${JSON.stringify(param.value)})`,
      );
      return;
    }
    if (param.kind === 'long') {
      lines.push(`  param(${JSON.stringify(param.key)}, ${param.value}L)`);
      return;
    }
    lines.push(`  param(${JSON.stringify(param.key)}, ${param.value})`);
  });
  lines.push('}');
  return lines.join('\n');
}

function generateAndroidJavaFirebaseSnippet({ example }) {
  const { eventName, params, usedFallback } = resolveFirebaseEvent(example);
  const lines = [];

  if (usedFallback) {
    lines.push(`// ${FIREBASE_FALLBACK_WARNING}`);
  }

  lines.push('Bundle params = new Bundle();');
  params.forEach((param) => {
    if (param.kind === 'string') {
      lines.push(
        `params.putString(${JSON.stringify(param.key)}, ${JSON.stringify(param.value)});`,
      );
      return;
    }
    if (param.kind === 'long') {
      lines.push(
        `params.putLong(${JSON.stringify(param.key)}, ${param.value}L);`,
      );
      return;
    }
    lines.push(
      `params.putDouble(${JSON.stringify(param.key)}, ${param.value});`,
    );
  });
  lines.push(
    `mFirebaseAnalytics.logEvent(${JSON.stringify(eventName)}, params);`,
  );
  return lines.join('\n');
}

function generateIosSwiftFirebaseSnippet({ example }) {
  const { eventName, params, usedFallback } = resolveFirebaseEvent(example);
  const lines = [];

  if (usedFallback) {
    lines.push(`// ${FIREBASE_FALLBACK_WARNING}`);
  }

  if (params.length === 0) {
    lines.push(
      `Analytics.logEvent(${JSON.stringify(eventName)}, parameters: nil)`,
    );
    return lines.join('\n');
  }

  lines.push(`Analytics.logEvent(${JSON.stringify(eventName)}, parameters: [`);
  params.forEach((param, index) => {
    const comma = index < params.length - 1 ? ',' : '';
    if (param.kind === 'string') {
      lines.push(
        `  ${JSON.stringify(param.key)}: ${JSON.stringify(param.value)}${comma}`,
      );
      return;
    }
    lines.push(`  ${JSON.stringify(param.key)}: ${param.value}${comma}`);
  });
  lines.push('])');
  return lines.join('\n');
}

function escapeObjCString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function generateIosObjcFirebaseSnippet({ example }) {
  const { eventName, params, usedFallback } = resolveFirebaseEvent(example);
  const lines = [];

  if (usedFallback) {
    lines.push(`// ${FIREBASE_FALLBACK_WARNING}`);
  }

  if (params.length === 0) {
    lines.push(
      `[FIRAnalytics logEventWithName:@"${escapeObjCString(eventName)}" parameters:nil];`,
    );
    return lines.join('\n');
  }

  lines.push(
    `[FIRAnalytics logEventWithName:@"${escapeObjCString(eventName)}" parameters:@{`,
  );
  params.forEach((param, index) => {
    const comma = index < params.length - 1 ? ',' : '';
    if (param.kind === 'string') {
      lines.push(
        `  @"${escapeObjCString(param.key)}": @"${escapeObjCString(param.value)}"${comma}`,
      );
      return;
    }
    lines.push(
      `  @"${escapeObjCString(param.key)}": @(${param.value})${comma}`,
    );
  });
  lines.push('}];');
  return lines.join('\n');
}

export const SNIPPET_TARGETS = [
  {
    id: 'web-datalayer-js',
    group: 'web',
    label: 'Web Data Layer (JS)',
    language: 'javascript',
    generator: generateWebDataLayerSnippet,
  },
  {
    id: 'android-firebase-kotlin-sdk',
    group: 'android',
    label: 'Android Firebase (Kotlin)',
    language: 'kotlin',
    generator: generateAndroidKotlinFirebaseSnippet,
  },
  {
    id: 'android-firebase-java-sdk',
    group: 'android',
    label: 'Android Firebase (Java)',
    language: 'java',
    generator: generateAndroidJavaFirebaseSnippet,
  },
  {
    id: 'ios-firebase-swift-sdk',
    group: 'ios',
    label: 'iOS Firebase (Swift)',
    language: 'swift',
    generator: generateIosSwiftFirebaseSnippet,
  },
  {
    id: 'ios-firebase-objc-sdk',
    group: 'ios',
    label: 'iOS Firebase (Obj-C)',
    language: 'objectivec',
    generator: generateIosObjcFirebaseSnippet,
  },
];

export function getSnippetTarget(targetId = DEFAULT_SNIPPET_TARGET_ID) {
  const target = SNIPPET_TARGETS.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Unknown snippet target: ${targetId}`);
  }
  return target;
}

export function generateSnippetForTarget({
  targetId = DEFAULT_SNIPPET_TARGET_ID,
  example,
  schema,
  config = {},
  dataLayerName,
}) {
  const target = getSnippetTarget(targetId);
  return target.generator({
    example,
    schema,
    config,
    dataLayerName,
    targetId,
  });
}

export const DEFAULT_SNIPPET_TARGET_ID = 'web-datalayer-js';
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
  {
    id: 'firebase-analytics-screenviews',
    url: 'https://firebase.google.com/docs/analytics/screenviews',
    reviewedAt: '2026-03-05',
  },
  {
    id: 'firebase-android-event-reference',
    url: 'https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics.Event',
    reviewedAt: '2026-03-05',
  },
  {
    id: 'firebase-android-param-reference',
    url: 'https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics.Param',
    reviewedAt: '2026-03-05',
  },
  {
    id: 'firebase-ios-constants-reference',
    url: 'https://firebase.google.com/docs/reference/ios/firebaseanalytics/api/reference/Constants',
    reviewedAt: '2026-03-05',
  },
  {
    id: 'firebase-android-user-property-reference',
    url: 'https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics.UserProperty',
    reviewedAt: '2026-03-05',
  },
];

const FIREBASE_PREDEFINED_EVENTS = new Set([
  'ad_impression',
  'add_payment_info',
  'add_shipping_info',
  'add_to_cart',
  'add_to_wishlist',
  'app_open',
  'begin_checkout',
  'campaign_details',
  'earn_virtual_currency',
  'generate_lead',
  'in_app_purchase',
  'join_group',
  'level_end',
  'level_start',
  'level_up',
  'login',
  'post_score',
  'purchase',
  'refund',
  'remove_from_cart',
  'screen_view',
  'search',
  'select_content',
  'select_item',
  'select_promotion',
  'share',
  'sign_up',
  'spend_virtual_currency',
  'tutorial_begin',
  'tutorial_complete',
  'unlock_achievement',
  'view_cart',
  'view_item',
  'view_item_list',
  'view_promotion',
  'view_search_results',
]);

const FIREBASE_PREDEFINED_PARAMS = new Set([
  'achievement_id',
  'aclid',
  'ad_format',
  'ad_platform',
  'ad_source',
  'ad_unit_name',
  'affiliation',
  'campaign',
  'campaign_id',
  'character',
  'content',
  'content_type',
  'coupon',
  'cp1',
  'creative_name',
  'creative_format',
  'creative_slot',
  'currency',
  'destination',
  'discount',
  'end_date',
  'extend_session',
  'flight_number',
  'free_trial',
  'group_id',
  'index',
  'items',
  'item_brand',
  'item_category',
  'item_category2',
  'item_category3',
  'item_category4',
  'item_category5',
  'item_id',
  'item_list_id',
  'item_list_name',
  'item_name',
  'item_variant',
  'level',
  'level_name',
  'location',
  'location_id',
  'medium',
  'method',
  'marketing_tactic',
  'number_of_nights',
  'number_of_passengers',
  'number_of_rooms',
  'origin',
  'payment_type',
  'price',
  'price_is_discounted',
  'product_id',
  'product_name',
  'promotion_id',
  'promotion_name',
  'quantity',
  'score',
  'screen_class',
  'screen_name',
  'search_term',
  'shipping',
  'shipping_tier',
  'source',
  'source_platform',
  'start_date',
  'subscription',
  'success',
  'tax',
  'term',
  'transaction_id',
  'travel_class',
  'value',
  'virtual_currency_name',
]);

const FIREBASE_PARAM_ALIASES = {
  firebase_screen: 'screen_name',
  firebase_screen_class: 'screen_class',
};

const FIREBASE_PARAM_CONSTANTS = {
  aclid: {
    kotlin: 'FirebaseAnalytics.Param.ACLID',
    java: 'FirebaseAnalytics.Param.ACLID',
    swift: 'AnalyticsParameterAdNetworkClickID',
    objc: 'kFIRParameterAdNetworkClickID',
  },
};

const FIREBASE_USER_PROPERTY_CONSTANTS = {
  allow_personalized_ads: {
    kotlin: 'FirebaseAnalytics.UserProperty.ALLOW_AD_PERSONALIZATION_SIGNALS',
    java: 'FirebaseAnalytics.UserProperty.ALLOW_AD_PERSONALIZATION_SIGNALS',
    swift: 'AnalyticsUserPropertyAllowAdPersonalizationSignals',
    objc: 'kFIRUserPropertyAllowAdPersonalizationSignals',
  },
  sign_up_method: {
    kotlin: 'FirebaseAnalytics.UserProperty.SIGN_UP_METHOD',
    java: 'FirebaseAnalytics.UserProperty.SIGN_UP_METHOD',
    swift: 'AnalyticsUserPropertySignUpMethod',
    objc: 'kFIRUserPropertySignUpMethod',
  },
};

const FIREBASE_USER_PROPERTY_ALIASES = {
  allow_ad_personalization_signals: 'allow_personalized_ads',
};

const FIREBASE_ABBREVIATIONS = {
  aclid: 'ACLID',
  id: 'ID',
  cp1: 'CP1',
};

function toFirebaseUpperSnake(key) {
  return key.toUpperCase();
}

function toFirebasePascalCase(key) {
  return key
    .split('_')
    .filter(Boolean)
    .map((segment) => {
      const abbreviation = FIREBASE_ABBREVIATIONS[segment.toLowerCase()];
      if (abbreviation) return abbreviation;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join('');
}

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

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function toFirebaseParamEntries(example) {
  const entries = [];
  Object.entries(example || {}).forEach(([key, value]) => {
    if (key === 'event' || key === '$schema' || value === undefined) return;
    if (key === 'user_properties') return;

    entries.push([key, value]);
  });
  return entries;
}

function toFirebaseUserPropertyEntries(example) {
  if (!isPlainObject(example?.user_properties)) return [];
  return Object.entries(example.user_properties).filter(
    ([, value]) => value !== undefined,
  );
}

function getFirebaseEventExpression(eventName, platform) {
  if (FIREBASE_PREDEFINED_EVENTS.has(eventName)) {
    const upper = toFirebaseUpperSnake(eventName);
    const pascal = toFirebasePascalCase(eventName);
    if (platform === 'kotlin' || platform === 'java') {
      return `FirebaseAnalytics.Event.${upper}`;
    }
    if (platform === 'swift') return `AnalyticsEvent${pascal}`;
    if (platform === 'objc') return `kFIREvent${pascal}`;
  }
  if (platform === 'objc') return `@"${escapeObjCString(eventName)}"`;
  return JSON.stringify(eventName);
}

function getFirebaseParamExpression(key, platform) {
  const canonicalKey = FIREBASE_PARAM_ALIASES[key] || key;
  const known = FIREBASE_PARAM_CONSTANTS[canonicalKey]?.[platform];
  if (known) return known;
  if (FIREBASE_PREDEFINED_PARAMS.has(canonicalKey)) {
    const upper = toFirebaseUpperSnake(canonicalKey);
    const pascal = toFirebasePascalCase(canonicalKey);
    if (platform === 'kotlin' || platform === 'java') {
      return `FirebaseAnalytics.Param.${upper}`;
    }
    if (platform === 'swift') return `AnalyticsParameter${pascal}`;
    if (platform === 'objc') return `kFIRParameter${pascal}`;
  }
  if (platform === 'objc') return `@"${escapeObjCString(key)}"`;
  return JSON.stringify(key);
}

function getFirebaseUserPropertyExpression(key, platform) {
  const canonicalKey = FIREBASE_USER_PROPERTY_ALIASES[key] || key;
  const known = FIREBASE_USER_PROPERTY_CONSTANTS[canonicalKey]?.[platform];
  if (known) return known;
  if (platform === 'objc') return `@"${escapeObjCString(key)}"`;
  return JSON.stringify(key);
}

function getFirebaseValueTypeLabel(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function createFirebaseShapeError({ targetId, fieldPath, value, expected }) {
  return new Error(
    `[${targetId}] Unsupported Firebase payload at "${fieldPath}": got ${getFirebaseValueTypeLabel(
      value,
    )}. Expected ${expected}.`,
  );
}

function resolveTypedFirebaseValue({ rawValue, targetId, fieldPath }) {
  if (typeof rawValue === 'string') {
    return { kind: 'string', value: rawValue };
  }
  if (typeof rawValue === 'number') {
    if (Number.isFinite(rawValue) && Number.isInteger(rawValue)) {
      return { kind: 'long', value: rawValue };
    }
    return { kind: 'double', value: rawValue };
  }
  if (typeof rawValue === 'boolean') {
    return { kind: 'long', value: rawValue ? 1 : 0 };
  }
  throw createFirebaseShapeError({
    targetId,
    fieldPath,
    value: rawValue,
    expected: 'primitive (string | number | boolean)',
  });
}

function resolveTypedFirebaseUserPropertyValue({
  rawValue,
  targetId,
  fieldPath,
}) {
  if (rawValue === null) {
    return { kind: 'null', value: null };
  }
  if (typeof rawValue === 'string') {
    return { kind: 'string', value: rawValue };
  }
  if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
    return {
      kind: 'string',
      value: String(rawValue),
    };
  }
  throw createFirebaseShapeError({
    targetId,
    fieldPath,
    value: rawValue,
    expected: 'string | number | boolean | null',
  });
}

function buildKotlinItemBundles(items, targetId) {
  const lines = [];
  const names = items.map((_, idx) => `item${idx + 1}`);

  items.forEach((item, idx) => {
    const varName = names[idx];
    lines.push(`val ${varName} = Bundle().apply {`);
    Object.entries(item).forEach(([key, rawValue]) => {
      const keyExpr = getFirebaseParamExpression(key, 'kotlin');
      const typed = resolveTypedFirebaseValue({
        rawValue,
        targetId,
        fieldPath: `items[${idx}].${key}`,
      });
      if (typed.kind === 'string') {
        lines.push(`  putString(${keyExpr}, ${JSON.stringify(typed.value)})`);
      } else if (typed.kind === 'long') {
        lines.push(`  putLong(${keyExpr}, ${typed.value}L)`);
      } else {
        lines.push(`  putDouble(${keyExpr}, ${typed.value})`);
      }
    });
    lines.push('}');
  });

  return { lines, names };
}

function buildJavaItemBundles(items, targetId) {
  const lines = [];
  const names = items.map((_, idx) => `item${idx + 1}`);

  items.forEach((item, idx) => {
    const varName = names[idx];
    lines.push(`Bundle ${varName} = new Bundle();`);
    Object.entries(item).forEach(([key, rawValue]) => {
      const keyExpr = getFirebaseParamExpression(key, 'java');
      const typed = resolveTypedFirebaseValue({
        rawValue,
        targetId,
        fieldPath: `items[${idx}].${key}`,
      });
      if (typed.kind === 'string') {
        lines.push(
          `${varName}.putString(${keyExpr}, ${JSON.stringify(typed.value)});`,
        );
      } else if (typed.kind === 'long') {
        lines.push(`${varName}.putLong(${keyExpr}, ${typed.value}L);`);
      } else {
        lines.push(`${varName}.putDouble(${keyExpr}, ${typed.value});`);
      }
    });
  });

  return { lines, names };
}

function buildSwiftItems(items, targetId) {
  const lines = [];
  const names = items.map((_, idx) => `item${idx + 1}`);

  items.forEach((item, idx) => {
    const varName = names[idx];
    lines.push(`var ${varName}: [String: Any] = [`);
    const entries = Object.entries(item);
    entries.forEach(([key, rawValue], entryIndex) => {
      const keyExpr = getFirebaseParamExpression(key, 'swift');
      const typed = resolveTypedFirebaseValue({
        rawValue,
        targetId,
        fieldPath: `items[${idx}].${key}`,
      });
      const comma = entryIndex < entries.length - 1 ? ',' : '';
      if (typed.kind === 'string') {
        lines.push(`  ${keyExpr}: ${JSON.stringify(typed.value)}${comma}`);
      } else {
        lines.push(`  ${keyExpr}: ${typed.value}${comma}`);
      }
    });
    lines.push(']');
  });

  return { lines, names };
}

function buildObjcItems(items, targetId) {
  const lines = [];
  const names = items.map((_, idx) => `item${idx + 1}`);

  items.forEach((item, idx) => {
    const varName = names[idx];
    lines.push(`NSMutableDictionary *${varName} = [@{`);
    const entries = Object.entries(item);
    entries.forEach(([key, rawValue], entryIndex) => {
      const keyExpr = getFirebaseParamExpression(key, 'objc');
      const typed = resolveTypedFirebaseValue({
        rawValue,
        targetId,
        fieldPath: `items[${idx}].${key}`,
      });
      const comma = entryIndex < entries.length - 1 ? ',' : '';
      if (typed.kind === 'string') {
        lines.push(`  ${keyExpr}: @"${escapeObjCString(typed.value)}"${comma}`);
      } else {
        lines.push(`  ${keyExpr}: @(${typed.value})${comma}`);
      }
    });
    lines.push('} mutableCopy];');
  });

  return { lines, names };
}

function resolveFirebaseEvent(example, targetId) {
  const eventName = example?.event;
  if (typeof eventName !== 'string' || eventName.trim().length === 0) {
    throw createFirebaseShapeError({
      targetId,
      fieldPath: 'event',
      value: eventName,
      expected: 'non-empty string',
    });
  }

  const params = [];
  toFirebaseParamEntries(example).forEach(([key, value]) => {
    if (key === 'items') {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => isPlainObject(item))
      ) {
        params.push({ key, kind: 'itemsObjectArray', items: value });
        return;
      }
      throw createFirebaseShapeError({
        targetId,
        fieldPath: key,
        value,
        expected: 'non-empty array of objects',
      });
    }

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
    throw createFirebaseShapeError({
      targetId,
      fieldPath: key,
      value,
      expected:
        'primitive (string | number | boolean), or "items" as non-empty array of objects',
    });
  });

  const userProperties = toFirebaseUserPropertyEntries(example).map(
    ([key, rawValue]) => {
      const typed = resolveTypedFirebaseUserPropertyValue({
        rawValue,
        targetId,
        fieldPath: `user_properties.${key}`,
      });
      return {
        key,
        kind: typed.kind,
        value: typed.value,
      };
    },
  );

  return {
    eventName,
    params,
    userProperties,
  };
}

function generateAndroidKotlinFirebaseSnippet({ example, targetId }) {
  const { eventName, params, userProperties } = resolveFirebaseEvent(
    example,
    targetId,
  );
  const lines = [];
  const eventExpr = getFirebaseEventExpression(eventName, 'kotlin');
  const itemsParam = params.find((p) => p.kind === 'itemsObjectArray');
  const itemBundles = itemsParam
    ? buildKotlinItemBundles(itemsParam.items, targetId)
    : null;

  if (itemBundles) {
    lines.push(...itemBundles.lines);
    lines.push('');
  }

  userProperties.forEach((property) => {
    const keyExpr = getFirebaseUserPropertyExpression(property.key, 'kotlin');
    const valueExpr =
      property.kind === 'null' ? 'null' : JSON.stringify(property.value);
    lines.push(`firebaseAnalytics.setUserProperty(${keyExpr}, ${valueExpr})`);
  });
  if (userProperties.length > 0) {
    lines.push('');
  }

  lines.push(`firebaseAnalytics.logEvent(${eventExpr}) {`);
  params.forEach((param) => {
    const keyExpr = getFirebaseParamExpression(param.key, 'kotlin');
    if (param.kind === 'itemsObjectArray') {
      lines.push(
        `  param(${keyExpr}, arrayOf(${itemBundles.names.join(', ')}))`,
      );
      return;
    }
    if (param.kind === 'string') {
      lines.push(`  param(${keyExpr}, ${JSON.stringify(param.value)})`);
      return;
    }
    if (param.kind === 'long') {
      lines.push(`  param(${keyExpr}, ${param.value}L)`);
      return;
    }
    lines.push(`  param(${keyExpr}, ${param.value})`);
  });
  lines.push('}');
  return lines.join('\n');
}

function generateAndroidJavaFirebaseSnippet({ example, targetId }) {
  const { eventName, params, userProperties } = resolveFirebaseEvent(
    example,
    targetId,
  );
  const lines = [];
  const eventExpr = getFirebaseEventExpression(eventName, 'java');
  const itemsParam = params.find((p) => p.kind === 'itemsObjectArray');
  const itemBundles = itemsParam
    ? buildJavaItemBundles(itemsParam.items, targetId)
    : null;

  if (itemBundles) {
    lines.push(...itemBundles.lines);
    lines.push('');
  }

  userProperties.forEach((property) => {
    const keyExpr = getFirebaseUserPropertyExpression(property.key, 'java');
    const valueExpr =
      property.kind === 'null' ? 'null' : JSON.stringify(property.value);
    lines.push(`mFirebaseAnalytics.setUserProperty(${keyExpr}, ${valueExpr});`);
  });
  if (userProperties.length > 0) {
    lines.push('');
  }

  lines.push('Bundle eventParams = new Bundle();');
  params.forEach((param) => {
    const keyExpr = getFirebaseParamExpression(param.key, 'java');
    if (param.kind === 'itemsObjectArray') {
      lines.push(
        `eventParams.putParcelableArray(${keyExpr}, new Parcelable[]{${itemBundles.names.join(', ')}});`,
      );
      return;
    }
    if (param.kind === 'string') {
      lines.push(
        `eventParams.putString(${keyExpr}, ${JSON.stringify(param.value)});`,
      );
      return;
    }
    if (param.kind === 'long') {
      lines.push(`eventParams.putLong(${keyExpr}, ${param.value}L);`);
      return;
    }
    lines.push(`eventParams.putDouble(${keyExpr}, ${param.value});`);
  });
  lines.push(`mFirebaseAnalytics.logEvent(${eventExpr}, eventParams);`);
  return lines.join('\n');
}

function generateIosSwiftFirebaseSnippet({ example, targetId }) {
  const { eventName, params, userProperties } = resolveFirebaseEvent(
    example,
    targetId,
  );
  const lines = [];
  const eventExpr = getFirebaseEventExpression(eventName, 'swift');
  const normalParams = params.filter((p) => p.kind !== 'itemsObjectArray');
  const itemsParam = params.find((p) => p.kind === 'itemsObjectArray');
  const swiftItems = itemsParam
    ? buildSwiftItems(itemsParam.items, targetId)
    : null;

  if (swiftItems) {
    lines.push(...swiftItems.lines);
    lines.push('');
  }

  userProperties.forEach((property) => {
    const keyExpr = getFirebaseUserPropertyExpression(property.key, 'swift');
    const valueExpr =
      property.kind === 'null' ? 'nil' : JSON.stringify(property.value);
    lines.push(`Analytics.setUserProperty(${valueExpr}, forName: ${keyExpr})`);
  });
  if (userProperties.length > 0) {
    lines.push('');
  }

  if (params.length === 0) {
    lines.push(`Analytics.logEvent(${eventExpr}, parameters: nil)`);
    return lines.join('\n');
  }

  lines.push('var eventParams: [String: Any] = [');
  normalParams.forEach((param, index) => {
    const comma = index < normalParams.length - 1 ? ',' : '';
    const keyExpr = getFirebaseParamExpression(param.key, 'swift');
    if (param.kind === 'string') {
      lines.push(`  ${keyExpr}: ${JSON.stringify(param.value)}${comma}`);
      return;
    }
    lines.push(`  ${keyExpr}: ${param.value}${comma}`);
  });
  lines.push(']');

  if (itemsParam) {
    const keyExpr = getFirebaseParamExpression(itemsParam.key, 'swift');
    lines.push(`eventParams[${keyExpr}] = [${swiftItems.names.join(', ')}]`);
  }

  lines.push(`Analytics.logEvent(${eventExpr}, parameters: eventParams)`);
  return lines.join('\n');
}

function escapeObjCString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function generateIosObjcFirebaseSnippet({ example, targetId }) {
  const { eventName, params, userProperties } = resolveFirebaseEvent(
    example,
    targetId,
  );
  const lines = [];
  const eventExpr = getFirebaseEventExpression(eventName, 'objc');
  const normalParams = params.filter((p) => p.kind !== 'itemsObjectArray');
  const itemsParam = params.find((p) => p.kind === 'itemsObjectArray');
  const objcItems = itemsParam
    ? buildObjcItems(itemsParam.items, targetId)
    : null;

  if (objcItems) {
    lines.push(...objcItems.lines);
    lines.push('');
  }

  userProperties.forEach((property) => {
    const keyExpr = getFirebaseUserPropertyExpression(property.key, 'objc');
    if (property.kind === 'null') {
      lines.push(
        `[FIRAnalytics setUserPropertyString:nil forName:${keyExpr}];`,
      );
      return;
    }
    lines.push(
      `[FIRAnalytics setUserPropertyString:@"${escapeObjCString(property.value)}" forName:${keyExpr}];`,
    );
  });
  if (userProperties.length > 0) {
    lines.push('');
  }

  if (params.length === 0) {
    lines.push(`[FIRAnalytics logEventWithName:${eventExpr} parameters:nil];`);
    return lines.join('\n');
  }

  lines.push('NSMutableDictionary *eventParams = [@{');
  normalParams.forEach((param, index) => {
    const comma = index < normalParams.length - 1 ? ',' : '';
    const keyExpr = getFirebaseParamExpression(param.key, 'objc');
    if (param.kind === 'string') {
      lines.push(`  ${keyExpr}: @"${escapeObjCString(param.value)}"${comma}`);
      return;
    }
    lines.push(`  ${keyExpr}: @(${param.value})${comma}`);
  });
  lines.push('} mutableCopy];');

  if (itemsParam) {
    const keyExpr = getFirebaseParamExpression(itemsParam.key, 'objc');
    lines.push(`eventParams[${keyExpr}] = @[${objcItems.names.join(', ')}];`);
  }

  lines.push(
    `[FIRAnalytics logEventWithName:${eventExpr} parameters:eventParams];`,
  );
  return lines.join('\n');
}

const META_KEYS = new Set(['$schema']);

function resolveCdpMethod(schema) {
  return schema?.['x-method'] ?? 'track';
}

function cdpProperties(example, excludeKeys) {
  return Object.fromEntries(
    Object.entries(example).filter(
      ([k]) => !META_KEYS.has(k) && !excludeKeys.has(k),
    ),
  );
}

function generateCdpSnippet(globalObj) {
  return function ({ example, schema, targetId }) {
    const method = resolveCdpMethod(schema);
    const call = method
      .split('.')
      .reduce((acc, key) => `${acc}.${key}`, globalObj);

    if (method === 'alias') {
      throw new Error(
        `[${targetId}] Snippet target does not support x-method "alias".`,
      );
    }

    if (method === 'track') {
      const eventName = example.event;
      const props = cdpProperties(example, new Set(['event']));
      const hasProps = Object.keys(props).length > 0;
      return hasProps
        ? `${call}(${JSON.stringify(eventName)}, ${JSON.stringify(props, null, 2)});`
        : `${call}(${JSON.stringify(eventName)});`;
    }

    if (method === 'identify') {
      const { userId } = example;
      const traits = cdpProperties(example, new Set(['userId']));
      const hasTraits = Object.keys(traits).length > 0;
      if (userId !== undefined) {
        return hasTraits
          ? `${call}(${JSON.stringify(userId)}, ${JSON.stringify(traits, null, 2)});`
          : `${call}(${JSON.stringify(userId)});`;
      }
      return hasTraits
        ? `${call}(${JSON.stringify(traits, null, 2)});`
        : `${call}();`;
    }

    if (method === 'group') {
      const { groupId } = example;
      const traits = cdpProperties(example, new Set(['groupId']));
      const hasTraits = Object.keys(traits).length > 0;
      return hasTraits
        ? `${call}(${JSON.stringify(groupId)}, ${JSON.stringify(traits, null, 2)});`
        : `${call}(${JSON.stringify(groupId)});`;
    }

    if (method === 'page') {
      const props = cdpProperties(example, new Set());
      const hasProps = Object.keys(props).length > 0;
      return hasProps
        ? `${call}(${JSON.stringify(props, null, 2)});`
        : `${call}();`;
    }

    const props = cdpProperties(example, new Set());
    const hasProps = Object.keys(props).length > 0;
    return hasProps
      ? `${call}(${JSON.stringify(props, null, 2)});`
      : `${call}();`;
  };
}

function generateBrazeWebSnippet({ example, schema, targetId }) {
  const method = resolveCdpMethod(schema);

  if (method === 'alias') {
    const { alias_name: aliasName, alias_label: aliasLabel } = example;
    if (
      typeof aliasName !== 'string' ||
      aliasName.trim().length === 0 ||
      typeof aliasLabel !== 'string' ||
      aliasLabel.trim().length === 0
    ) {
      throw new Error(
        `[${targetId}] Braze alias snippets require non-empty string alias_name and alias_label.`,
      );
    }

    return `braze.getUser().addAlias(${JSON.stringify(aliasName)}, ${JSON.stringify(aliasLabel)});`;
  }

  if (method === 'identify') {
    const { userId } = example;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error(
        `[${targetId}] Braze identify snippets require a non-empty string userId.`,
      );
    }

    const traits = cdpProperties(example, new Set(['userId']));
    const lines = [`braze.changeUser(${JSON.stringify(userId)});`];
    const traitEntries = Object.entries(traits);

    if (traitEntries.length > 0) {
      lines.push('const user = braze.getUser();');
      traitEntries.forEach(([key, value]) => {
        lines.push(
          `user.setCustomUserAttribute(${JSON.stringify(key)}, ${JSON.stringify(value)});`,
        );
      });
    }

    return lines.join('\n');
  }

  if (method !== 'track') {
    throw new Error(
      `[${targetId}] Braze snippets only support x-method "track", "identify", or "alias".`,
    );
  }

  const eventName = example.event;
  const properties = cdpProperties(example, new Set(['event']));
  const hasProperties = Object.keys(properties).length > 0;

  return hasProperties
    ? `braze.logCustomEvent(${JSON.stringify(eventName)}, ${JSON.stringify(properties, null, 2)});`
    : `braze.logCustomEvent(${JSON.stringify(eventName)});`;
}

function toPhpValue(value, indent) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value}'`;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inner = value
      .map((v) => `${indent}    ${toPhpValue(v, indent + '    ')}`)
      .join(',\n');
    return `[\n${inner},\n${indent}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '[]';
    const inner = entries
      .map(
        ([k, v]) => `${indent}    '${k}' => ${toPhpValue(v, indent + '    ')}`,
      )
      .join(',\n');
    return `[\n${inner},\n${indent}]`;
  }
  return String(value);
}

/**
 * Resolves a RudderStack server-side call (track/identify/group/page) into a
 * syntax-agnostic descriptor that target renderers turn into PHP, Java, etc.
 *
 * Captures the logic shared across server targets: the non-empty userId guard,
 * the per-method identity fields and payload (properties/traits), the track
 * "unwrap a nested properties object" rule, and the unsupported-method guard.
 *
 * `pageNameAsArgument` toggles the one genuine divergence between SDKs: builder
 * SDKs (Java) take the page name as a constructor argument and drop it from the
 * properties, while array SDKs (PHP) keep it inside the properties payload.
 */
function resolveCdpServerMessage(
  example,
  schema,
  { targetId, label, pageNameAsArgument = false },
) {
  const method = resolveCdpMethod(schema);

  if (
    typeof example.userId !== 'string' ||
    example.userId.trim().length === 0
  ) {
    throw new Error(
      `[${targetId}] ${label} RudderStack snippets require a non-empty string userId.`,
    );
  }

  const message = { method, userId: example.userId };

  if (method === 'track') {
    const remaining = cdpProperties(example, new Set(['userId', 'event']));
    const { properties: nestedProps, ...otherRemaining } = remaining;
    message.event = example.event;
    message.payloadKey = 'properties';
    message.payload = isPlainObject(nestedProps)
      ? { ...nestedProps, ...otherRemaining }
      : remaining;
    return message;
  }

  if (method === 'identify') {
    message.payloadKey = 'traits';
    message.payload = cdpProperties(example, new Set(['userId']));
    return message;
  }

  if (method === 'group') {
    message.groupId = example.groupId;
    message.payloadKey = 'traits';
    message.payload = cdpProperties(example, new Set(['userId', 'groupId']));
    return message;
  }

  if (method === 'page') {
    const excluded = new Set(['userId']);
    if (pageNameAsArgument) {
      message.name = example.name ?? '';
      excluded.add('name');
    }
    message.payloadKey = 'properties';
    message.payload = cdpProperties(example, excluded);
    return message;
  }

  throw new Error(
    `[${targetId}] ${label} RudderStack snippet does not support x-method "${method}".`,
  );
}

function generatePhpRudderstackSnippet({ example, schema, targetId }) {
  const message = resolveCdpServerMessage(example, schema, {
    targetId,
    label: 'PHP',
  });

  const lines = [`    'userId' => '${message.userId}'`];
  if (message.method === 'track') {
    lines.push(`    'event' => '${message.event}'`);
  }
  if (message.method === 'group') {
    lines.push(`    'groupId' => '${message.groupId}'`);
  }
  if (Object.keys(message.payload).length > 0) {
    lines.push(
      `    '${message.payloadKey}' => ${toPhpValue(message.payload, '    ')}`,
    );
  }

  return `Rudder::${message.method}([\n${lines.join(',\n')},\n]);`;
}

function toJavaValue(value, indent) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return 'ImmutableList.of()';
    const inner = value
      .map((v) => `${indent}    ${toJavaValue(v, indent + '    ')}`)
      .join(',\n');
    return `ImmutableList.of(\n${inner}\n${indent})`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return 'ImmutableMap.of()';
    const inner = entries
      .map(
        ([k, v]) =>
          `${indent}    .put(${JSON.stringify(k)}, ${toJavaValue(
            v,
            indent + '    ',
          )})`,
      )
      .join('\n');
    return `ImmutableMap.builder()\n${inner}\n${indent}    .build()`;
  }
  return String(value);
}

function buildJavaEnqueue(builderExpr, chainLines) {
  const lines = [`analytics.enqueue(${builderExpr}`, ...chainLines];
  const lastIndex = lines.length - 1;
  lines[lastIndex] = `${lines[lastIndex]});`;
  return lines.join('\n');
}

const JAVA_MESSAGE_BUILDERS = {
  track: (message) => `TrackMessage.builder(${JSON.stringify(message.event)})`,
  identify: () => 'IdentifyMessage.builder()',
  group: (message) =>
    `GroupMessage.builder(${JSON.stringify(message.groupId)})`,
  page: (message) => `PageMessage.builder(${JSON.stringify(message.name)})`,
};

function generateJavaRudderstackSnippet({ example, schema, targetId }) {
  const message = resolveCdpServerMessage(example, schema, {
    targetId,
    label: 'Java',
    pageNameAsArgument: true,
  });

  const chain = [`    .userId(${JSON.stringify(message.userId)})`];
  if (Object.keys(message.payload).length > 0) {
    chain.push(
      `    .${message.payloadKey}(${toJavaValue(message.payload, '    ')})`,
    );
  }

  return buildJavaEnqueue(
    JAVA_MESSAGE_BUILDERS[message.method](message),
    chain,
  );
}

export const SNIPPET_TARGETS = [
  {
    id: 'web-datalayer-js',
    group: 'web',
    label: 'Web Data Layer (JS)',
    language: 'javascript',
    generateSnippet: generateWebDataLayerSnippet,
  },
  {
    id: 'android-firebase-kotlin-sdk',
    group: 'android',
    label: 'Android Firebase (Kotlin)',
    language: 'kotlin',
    generateSnippet: generateAndroidKotlinFirebaseSnippet,
  },
  {
    id: 'android-firebase-java-sdk',
    group: 'android',
    label: 'Android Firebase (Java)',
    language: 'java',
    generateSnippet: generateAndroidJavaFirebaseSnippet,
  },
  {
    id: 'ios-firebase-swift-sdk',
    group: 'ios',
    label: 'iOS Firebase (Swift)',
    language: 'swift',
    generateSnippet: generateIosSwiftFirebaseSnippet,
  },
  {
    id: 'ios-firebase-objc-sdk',
    group: 'ios',
    label: 'iOS Firebase (Obj-C)',
    language: 'objectivec',
    generateSnippet: generateIosObjcFirebaseSnippet,
  },
  {
    id: 'web-segment-js',
    group: 'web',
    label: 'Segment (JS)',
    language: 'javascript',
    generateSnippet: generateCdpSnippet('analytics'),
  },
  {
    id: 'web-rudderstack-js',
    group: 'web',
    label: 'RudderStack (JS)',
    language: 'javascript',
    generateSnippet: generateCdpSnippet('rudderanalytics'),
  },
  {
    id: 'web-hightouch-js',
    group: 'web',
    label: 'Hightouch (JS)',
    language: 'javascript',
    generateSnippet: generateCdpSnippet('htevents'),
  },
  {
    id: 'web-braze-js',
    group: 'web',
    label: 'Braze Web SDK (JS)',
    language: 'javascript',
    generateSnippet: generateBrazeWebSnippet,
  },
  {
    id: 'server-rudderstack-php',
    group: 'server',
    label: 'RudderStack (PHP)',
    language: 'php',
    generateSnippet: generatePhpRudderstackSnippet,
  },
  {
    id: 'server-rudderstack-java',
    group: 'server',
    label: 'RudderStack (Java)',
    language: 'java',
    generateSnippet: generateJavaRudderstackSnippet,
  },
];

function normalizeTrackingTarget(target) {
  if (!target?.id || typeof target.id !== 'string') {
    throw new Error('Tracking target must define a string id.');
  }
  if (typeof target.generateSnippet !== 'function') {
    throw new Error(
      `Tracking target "${target.id}" must define generateSnippet.`,
    );
  }

  return target;
}

export function createTrackingTargetRegistry({ customTargets = [] } = {}) {
  const targets = [...SNIPPET_TARGETS, ...customTargets].map(
    normalizeTrackingTarget,
  );
  const targetMap = new Map();

  targets.forEach((target) => {
    if (targetMap.has(target.id)) {
      throw new Error(`Duplicate tracking target id: ${target.id}`);
    }
    targetMap.set(target.id, target);
  });

  return {
    get(targetId = DEFAULT_SNIPPET_TARGET_ID) {
      const target = targetMap.get(targetId);
      if (!target) {
        throw new Error(`Unknown snippet target: ${targetId}`);
      }
      return target;
    },
    has(targetId) {
      return targetMap.has(targetId);
    },
    ids() {
      return [...targetMap.keys()];
    },
    list() {
      return [...targetMap.values()];
    },
    generateSnippet({
      targetId = DEFAULT_SNIPPET_TARGET_ID,
      example,
      schema,
      config = {},
      dataLayerName,
    }) {
      const target = this.get(targetId);
      return target.generateSnippet({
        example,
        schema,
        config,
        dataLayerName,
        targetId,
      });
    },
  };
}

const DEFAULT_TRACKING_TARGET_REGISTRY = createTrackingTargetRegistry();

export function getSnippetTarget(
  targetId = DEFAULT_SNIPPET_TARGET_ID,
  targetRegistry = DEFAULT_TRACKING_TARGET_REGISTRY,
) {
  try {
    return targetRegistry.get(targetId);
  } catch {
    throw new Error(`Unknown snippet target: ${targetId}`);
  }
}

export function generateSnippetForTarget({
  targetId = DEFAULT_SNIPPET_TARGET_ID,
  example,
  schema,
  config = {},
  dataLayerName,
  targetRegistry = DEFAULT_TRACKING_TARGET_REGISTRY,
}) {
  return targetRegistry.generateSnippet({
    targetId,
    example,
    schema,
    config,
    dataLayerName,
  });
}

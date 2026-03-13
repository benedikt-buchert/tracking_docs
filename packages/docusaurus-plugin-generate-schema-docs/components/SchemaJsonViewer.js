import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { usePrismTheme } from '@docusaurus/theme-common';
import { Highlight } from 'prism-react-renderer';

const SCHEMA_META_KEYS = [
  '$schema',
  '$id',
  '$anchor',
  '$dynamicAnchor',
  '$comment',
  '$vocabulary',
];

const SCHEMA_STRUCTURAL_KEYS = new Set([
  '$ref',
  '$defs',
  'properties',
  'required',
  'allOf',
  'anyOf',
  'oneOf',
  'if',
  'then',
  'else',
  'not',
  'items',
  'prefixItems',
  'contains',
  'dependentSchemas',
  'patternProperties',
  'additionalProperties',
]);

const SCHEMA_NAME_MAP_KEYS = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'dependentSchemas',
]);

function isExternalRef(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

function normalizePathSegments(pathValue) {
  const normalized = pathValue.replace(/\\/g, '/');
  const isAbsolute = normalized.startsWith('/');
  const segments = normalized.split('/');
  const resolvedSegments = [];

  segments.forEach((segment) => {
    if (!segment || segment === '.') return;
    if (segment === '..') {
      resolvedSegments.pop();
      return;
    }
    resolvedSegments.push(segment);
  });

  return `${isAbsolute ? '/' : ''}${resolvedSegments.join('/')}`;
}

function dirname(pathValue) {
  const normalized = normalizePathSegments(pathValue);
  const segments = normalized.split('/');

  if (segments.length <= 1) {
    return normalized.startsWith('/') ? '/' : '.';
  }

  segments.pop();
  const joined = segments.join('/');
  return joined || '/';
}

function resolveLocalRef(currentPath, refValue) {
  if (!currentPath || typeof refValue !== 'string') return null;
  if (refValue.startsWith('#')) return null;
  return normalizePathSegments(`${dirname(currentPath)}/${refValue}`);
}

function getSchemaKeywordClassName(key, parentKey) {
  if (parentKey && SCHEMA_NAME_MAP_KEYS.has(parentKey)) {
    return '';
  }

  if (SCHEMA_META_KEYS.includes(key)) {
    return 'schema-json-viewer__keyword schema-json-viewer__keyword--meta';
  }

  if (SCHEMA_STRUCTURAL_KEYS.has(key)) {
    return 'schema-json-viewer__keyword schema-json-viewer__keyword--structural';
  }

  return '';
}

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

function createParserState() {
  return {
    stack: [],
  };
}

function beginNestedValue(state, tokenContent) {
  const currentContext = state.stack[state.stack.length - 1];
  let parentKey = null;

  if (currentContext?.type === 'object' && currentContext.afterColon) {
    parentKey = currentContext.currentKey;
    currentContext.currentKey = null;
    currentContext.afterColon = false;
  }

  state.stack.push({
    type: tokenContent === '{' ? 'object' : 'array',
    parentKey,
    currentKey: null,
    afterColon: false,
  });
}

function classifyRenderedToken(state, token) {
  const currentContext = state.stack[state.stack.length - 1];
  const tokenTypes = new Set(token.types);
  const content = token.content;
  const semantic = {};

  if (!content) {
    return semantic;
  }

  if (tokenTypes.has('property')) {
    const key = JSON.parse(content);
    semantic.propertyKey = key;
    semantic.parentKey = currentContext?.parentKey ?? null;

    if (currentContext?.type === 'object') {
      currentContext.currentKey = key;
      currentContext.afterColon = false;
    }

    return semantic;
  }

  if (content === ':') {
    if (
      currentContext?.type === 'object' &&
      currentContext.currentKey !== null
    ) {
      currentContext.afterColon = true;
    }
    return semantic;
  }

  if (content === '{' || content === '[') {
    beginNestedValue(state, content);
    return semantic;
  }

  if (content === '}' || content === ']') {
    state.stack.pop();
    return semantic;
  }

  if (content === ',') {
    if (currentContext?.type === 'object') {
      currentContext.currentKey = null;
      currentContext.afterColon = false;
    }
    return semantic;
  }

  if (currentContext?.type === 'object' && currentContext.afterColon) {
    if (tokenTypes.has('string') && content.trim().startsWith('"')) {
      semantic.valueKey = currentContext.currentKey;
      semantic.stringValue = JSON.parse(content);
      currentContext.currentKey = null;
      currentContext.afterColon = false;
      return semantic;
    }

    if (
      tokenTypes.has('number') ||
      tokenTypes.has('boolean') ||
      (tokenTypes.has('keyword') && content === 'null')
    ) {
      currentContext.currentKey = null;
      currentContext.afterColon = false;
    }
  }

  return semantic;
}

function renderToken({
  token,
  tokenIndex,
  getTokenProps,
  semantic,
  currentPath,
  schemaSources,
  onNavigate,
}) {
  const tokenProps = getTokenProps({ token, key: tokenIndex });
  const propertyKeyClassName = semantic.propertyKey
    ? getSchemaKeywordClassName(semantic.propertyKey, semantic.parentKey)
    : '';
  const className = joinClassNames(tokenProps.className, propertyKeyClassName);

  if (
    semantic.valueKey === '$ref' &&
    typeof semantic.stringValue === 'string'
  ) {
    if (isExternalRef(semantic.stringValue)) {
      return (
        <Link
          key={tokenIndex}
          className={joinClassNames(
            className,
            'schema-json-viewer__link',
            'schema-json-viewer__ref-link',
          )}
          style={tokenProps.style}
          href={semantic.stringValue}
          target="_blank"
          rel="noreferrer"
        >
          {token.content}
        </Link>
      );
    }

    const resolvedRef = resolveLocalRef(currentPath, semantic.stringValue);
    if (resolvedRef && schemaSources?.[resolvedRef]) {
      return (
        <button
          key={tokenIndex}
          type="button"
          className={joinClassNames(
            className,
            'schema-json-viewer__link',
            'schema-json-viewer__ref-link',
          )}
          style={tokenProps.style}
          onClick={() => onNavigate(resolvedRef)}
        >
          {token.content}
        </button>
      );
    }
  }

  return (
    <span
      key={tokenIndex}
      className={className || tokenProps.className}
      style={tokenProps.style}
    >
      {token.content}
    </span>
  );
}

export default function SchemaJsonViewer({
  schema,
  sourcePath = null,
  schemaSources = null,
}) {
  const prismTheme = usePrismTheme();
  const resolvedSchemaSources =
    schemaSources || (sourcePath ? { [sourcePath]: schema } : {});
  const rootPath = sourcePath;
  const [currentPath, setCurrentPath] = useState(rootPath);

  const currentSchema =
    (currentPath && resolvedSchemaSources?.[currentPath]) || schema;
  const formattedSchema = JSON.stringify(currentSchema, null, 2);

  return (
    <details className="schema-json-viewer">
      <summary>View Raw JSON Schema</summary>
      {rootPath && currentPath !== rootPath ? (
        <div className="schema-json-viewer__controls">
          <button
            type="button"
            className="schema-json-viewer__link"
            onClick={() => setCurrentPath(rootPath)}
          >
            Back to root
          </button>
        </div>
      ) : null}
      <Highlight code={formattedSchema} language="json" theme={prismTheme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => {
          const parserState = createParserState();

          return (
            <pre className={className} style={style} data-language="json">
              <code className="language-json">
                {tokens.map((line, lineIndex) => (
                  <span
                    key={lineIndex}
                    {...getLineProps({ line, key: lineIndex })}
                  >
                    {line.map((token, tokenIndex) =>
                      renderToken({
                        token,
                        tokenIndex,
                        getTokenProps,
                        semantic: classifyRenderedToken(parserState, token),
                        currentPath,
                        schemaSources: resolvedSchemaSources,
                        onNavigate: setCurrentPath,
                      }),
                    )}
                    {'\n'}
                  </span>
                ))}
              </code>
            </pre>
          );
        }}
      </Highlight>
    </details>
  );
}

import React, { Fragment, useState } from 'react';
import Link from '@docusaurus/Link';

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

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

function JsonIndent({ depth }) {
  return <span>{'  '.repeat(depth)}</span>;
}

function JsonPrimitive({
  value,
  propertyKey,
  currentPath,
  schemaSources,
  onNavigate,
}) {
  const interactiveRefClassName = 'schema-json-viewer__link';
  const quotedValue = `${JSON.stringify(value)}`;

  if (typeof value === 'string') {
    if (propertyKey === '$ref') {
      if (isExternalRef(value)) {
        return (
          <Link
            className={interactiveRefClassName}
            href={value}
            target="_blank"
            rel="noreferrer"
          >
            {quotedValue}
          </Link>
        );
      }

      const resolvedRef = resolveLocalRef(currentPath, value);
      if (resolvedRef && schemaSources?.[resolvedRef]) {
        return (
          <button
            type="button"
            className={interactiveRefClassName}
            onClick={() => onNavigate(resolvedRef)}
          >
            {quotedValue}
          </button>
        );
      }
    }

    return <span className="token string">{quotedValue}</span>;
  }

  if (typeof value === 'number') {
    return <span className="token number">{value}</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="token boolean">{String(value)}</span>;
  }

  return <span className="token null keyword">null</span>;
}

function JsonNode({
  value,
  depth,
  currentPath,
  schemaSources,
  onNavigate,
  propertyKey = null,
}) {
  if (Array.isArray(value)) {
    return (
      <>
        <span className="token punctuation">[</span>
        {value.length > 0 && <br />}
        {value.map((item, index) => (
          <Fragment key={`${depth}-${index}`}>
            <JsonIndent depth={depth + 1} />
            <JsonNode
              value={item}
              depth={depth + 1}
              currentPath={currentPath}
              schemaSources={schemaSources}
              onNavigate={onNavigate}
            />
            {index < value.length - 1 && (
              <span className="token punctuation">,</span>
            )}
            <br />
          </Fragment>
        ))}
        {value.length > 0 && <JsonIndent depth={depth} />}
        <span className="token punctuation">]</span>
      </>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    return (
      <>
        <span className="token punctuation">{'{'}</span>
        {entries.length > 0 && <br />}
        {entries.map(([key, child], index) => (
          <Fragment key={`${depth}-${key}`}>
            <JsonIndent depth={depth + 1} />
            <span className="token property">{JSON.stringify(key)}</span>
            <span className="token punctuation">: </span>
            <JsonNode
              value={child}
              depth={depth + 1}
              currentPath={currentPath}
              schemaSources={schemaSources}
              onNavigate={onNavigate}
              propertyKey={key}
            />
            {index < entries.length - 1 && (
              <span className="token punctuation">,</span>
            )}
            <br />
          </Fragment>
        ))}
        {entries.length > 0 && <JsonIndent depth={depth} />}
        <span className="token punctuation">{'}'}</span>
      </>
    );
  }

  return (
    <JsonPrimitive
      value={value}
      propertyKey={propertyKey}
      currentPath={currentPath}
      schemaSources={schemaSources}
      onNavigate={onNavigate}
    />
  );
}

export default function SchemaJsonViewer({
  schema,
  sourcePath = null,
  schemaSources = null,
}) {
  const resolvedSchemaSources =
    schemaSources || (sourcePath ? { [sourcePath]: schema } : {});
  const rootPath = sourcePath;
  const [currentPath, setCurrentPath] = useState(rootPath);

  const currentSchema =
    (currentPath && resolvedSchemaSources?.[currentPath]) || schema;

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
      <pre data-language="json">
        <code className="language-json">
          <JsonNode
            value={currentSchema}
            depth={0}
            currentPath={currentPath}
            schemaSources={resolvedSchemaSources}
            onNavigate={setCurrentPath}
          />
        </code>
      </pre>
    </details>
  );
}

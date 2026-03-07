import React, { useEffect, useMemo } from 'react';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import {
  buildExampleModel,
  findClearableProperties,
} from '../helpers/exampleModel';

const TARGET_HASH_KEY = 'target';
const TARGET_HASH_PREFIX = `${TARGET_HASH_KEY}-`;
const TARGET_STORAGE_KEY = 'tracking-docs-selected-target';

function parseHashTarget(rawHash = '') {
  const raw = rawHash.startsWith('#') ? rawHash.substring(1) : rawHash;
  if (!raw) return null;
  if (raw.startsWith(TARGET_HASH_PREFIX)) {
    return raw.substring(TARGET_HASH_PREFIX.length) || null;
  }
  return null;
}

function readHashTarget() {
  if (typeof window === 'undefined') return null;
  return parseHashTarget(window.location.hash || '');
}

function readSearchTarget(search = '') {
  const query = search.startsWith('?') ? search.substring(1) : search;
  if (!query) return null;
  const params = new URLSearchParams(query);
  return params.get(TARGET_HASH_KEY);
}

function persistTarget(targetId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TARGET_STORAGE_KEY, targetId);
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#${TARGET_HASH_PREFIX}${targetId}`,
  );
}

function resolveInitialTargetId(targets) {
  const safeTargets = Array.isArray(targets)
    ? targets.filter((t) => t && typeof t.id === 'string' && t.id.length > 0)
    : [];
  if (safeTargets.length === 0) return null;
  const validTargetIds = new Set(safeTargets.map((t) => t.id));

  const fromHash = readHashTarget();
  if (fromHash && validTargetIds.has(fromHash)) {
    return fromHash;
  }

  if (typeof window !== 'undefined') {
    const fromStorage = window.localStorage.getItem(TARGET_STORAGE_KEY);
    if (fromStorage && validTargetIds.has(fromStorage)) {
      return fromStorage;
    }
  }

  return safeTargets[0].id;
}

export default function ExampleDataLayer({ schema, dataLayerName }) {
  const model = useMemo(
    () => buildExampleModel(schema, { dataLayerName }),
    [schema, dataLayerName],
  );
  const safeTargets = useMemo(
    () =>
      (Array.isArray(model.targets) ? model.targets : []).filter(
        (target) =>
          target && typeof target.id === 'string' && target.id.length > 0,
      ),
    [model.targets],
  );
  const exampleGroups = model.variantGroups;
  const targetId = resolveInitialTargetId(safeTargets);
  const showTargetTabs = safeTargets.length > 1;
  const validTargetIds = useMemo(
    () => new Set(safeTargets.map((target) => target.id)),
    [safeTargets],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let isSyncing = false;
    const originalReplaceState = window.history.replaceState;

    const syncFromSearch = () => {
      if (isSyncing) return;
      const targetFromSearch = readSearchTarget(window.location.search);
      if (!targetFromSearch || !validTargetIds.has(targetFromSearch)) return;

      isSyncing = true;
      try {
        window.localStorage.setItem(TARGET_STORAGE_KEY, targetFromSearch);

        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete(TARGET_HASH_KEY);
        const remainingSearch = searchParams.toString();
        const searchPart = remainingSearch ? `?${remainingSearch}` : '';

        originalReplaceState.call(
          window.history,
          null,
          '',
          `${window.location.pathname}${searchPart}#${TARGET_HASH_PREFIX}${targetFromSearch}`,
        );
      } finally {
        isSyncing = false;
      }
    };

    syncFromSearch();
    window.history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(window.history, args);
      syncFromSearch();
      return result;
    };

    return () => {
      window.history.replaceState = originalReplaceState;
    };
  }, [validTargetIds]);

  if (!exampleGroups || exampleGroups.length === 0) {
    return null;
  }

  const getLanguageForTarget = (targetIdForSnippet) =>
    safeTargets.find((target) => target.id === targetIdForSnippet)?.language ||
    'javascript';

  const renderVariantGroups = (currentTargetId) => (
    <>
      {exampleGroups.map((group) => {
        const showVariantTabs = group.options.length > 1;

        if (!showVariantTabs) {
          return (
            <div key={group.property} style={{ marginTop: '20px' }}>
              {!model.isSimpleDefault && (
                <Heading as="h4">
                  <code>{group.property}</code> options:
                </Heading>
              )}
              <CodeBlock language={getLanguageForTarget(currentTargetId)}>
                {group.options[0].snippets[currentTargetId]}
              </CodeBlock>
            </div>
          );
        }

        return (
          <div key={group.property} style={{ marginTop: '20px' }}>
            <Heading as="h4">
              <code>{group.property}</code> options:
            </Heading>
            <Tabs>
              {group.options.map(({ id, title, snippets }) => (
                <TabItem value={id} label={title} key={id}>
                  <CodeBlock language={getLanguageForTarget(currentTargetId)}>
                    {snippets[currentTargetId]}
                  </CodeBlock>
                </TabItem>
              ))}
            </Tabs>
          </div>
        );
      })}
    </>
  );

  // Single target + single default variant => keep old layout
  if (!showTargetTabs && model.isSimpleDefault) {
    const snippets = exampleGroups[0].options[0].snippets || {};
    const codeSnippet =
      (targetId && snippets[targetId]) || Object.values(snippets)[0] || '';
    return (
      <CodeBlock language={getLanguageForTarget(targetId)}>
        {codeSnippet}
      </CodeBlock>
    );
  }

  if (!showTargetTabs) {
    return renderVariantGroups(targetId);
  }

  return (
    <div data-testid="target-tabs">
      <Tabs defaultValue={targetId} queryString={TARGET_HASH_KEY}>
        {safeTargets.map((target) => (
          <TabItem value={target.id} label={target.label} key={target.id}>
            <span id={`${TARGET_HASH_PREFIX}${target.id}`} />
            {renderVariantGroups(target.id)}
          </TabItem>
        ))}
      </Tabs>
    </div>
  );
}

export {
  findClearableProperties,
  resolveInitialTargetId,
  readHashTarget,
  readSearchTarget,
  TARGET_STORAGE_KEY,
};

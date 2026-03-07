import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExampleDataLayer, {
  findClearableProperties,
  readHashTarget,
  readSearchTarget,
  resolveInitialTargetId,
  TARGET_STORAGE_KEY,
} from '../components/ExampleDataLayer';
import choiceEventSchema from './__fixtures__/static/schemas/choice-event.json';

// Mock the CodeBlock to make assertions on its content easier
jest.mock('@theme/CodeBlock', () => {
  return function CodeBlock({ children, language }) {
    return <pre data-language={language}>{children}</pre>;
  };
});

jest.mock('@theme/Tabs', () => {
  return function Tabs({ children, queryString, defaultValue }) {
    const attrs = {};
    if (queryString !== undefined) {
      attrs['data-query-string'] = queryString;
    }
    if (defaultValue !== undefined) {
      attrs['data-default-value'] = defaultValue;
    }

    return (
      <div data-testid="tabs" {...attrs}>
        {children}
      </div>
    );
  };
});

jest.mock('@theme/TabItem', () => {
  return function TabItem({ children, label }) {
    return (
      <div data-testid="tab-item" data-label={label}>
        {children}
      </div>
    );
  };
});

describe('ExampleDataLayer', () => {
  afterEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
  });

  it('should render a single example for a simple schema', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };
    const { container } = render(<ExampleDataLayer schema={schema} />);
    expect(container).toMatchSnapshot();
  });

  it('should render nothing for an empty schema', () => {
    const { container } = render(<ExampleDataLayer schema={{}} />);
    // An empty schema produces no examples, so the component should render null
    expect(container.firstChild).toBeNull();
  });

  it('should render grouped tabs for a schema with choices', () => {
    const { container, getAllByTestId } = render(
      <ExampleDataLayer schema={choiceEventSchema} />,
    );

    // Check for the group headings
    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings[0]).toHaveTextContent(/user_id options:/);
    expect(headings[1]).toHaveTextContent(/payment_method options:/);

    const tabItems = getAllByTestId('tab-item');
    // 2 options for user_id + 2 options for payment_method = 4 tabs total
    expect(tabItems).toHaveLength(4);

    // Check the labels for one of the groups
    expect(tabItems[0]).toHaveAttribute('data-label', 'User ID as String');
    expect(tabItems[1]).toHaveAttribute('data-label', 'User ID as Integer');

    // Let snapshot testing verify the complex content of each tab
    expect(container).toMatchSnapshot();
  });

  it('should use the provided dataLayerName', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };
    const { getByText } = render(
      <ExampleDataLayer schema={schema} dataLayerName="customDataLayer" />,
    );
    expect(getByText(/window.customDataLayer.push/)).toBeInTheDocument();
  });

  it('should render target tabs when multiple targets are configured', () => {
    const schema = {
      type: 'object',
      'x-tracking-targets': ['web-datalayer-js', 'android-firebase-kotlin-sdk'],
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const { getByTestId, getAllByTestId } = render(
      <ExampleDataLayer schema={schema} />,
    );
    expect(getByTestId('target-tabs')).toBeInTheDocument();
    const tabLabels = getAllByTestId('tab-item').map((item) =>
      item.getAttribute('data-label'),
    );
    expect(tabLabels).toEqual(
      expect.arrayContaining([
        'Web Data Layer (JS)',
        'Android Firebase (Kotlin)',
      ]),
    );
    expect(getByTestId('tabs')).toHaveAttribute('data-query-string', 'target');
  });

  it('uses per-target syntax highlighting language', () => {
    const schema = {
      type: 'object',
      'x-tracking-targets': ['android-firebase-kotlin-sdk'],
      properties: {
        event: { type: 'string', examples: ['purchase'] },
        value: { type: 'number', examples: [14.98] },
      },
    };

    const { container } = render(<ExampleDataLayer schema={schema} />);
    const codeBlocks = container.querySelectorAll('pre[data-language]');
    expect(codeBlocks.length).toBeGreaterThan(0);
    expect(codeBlocks[0]).toHaveAttribute('data-language', 'kotlin');
  });

  it('should not render target tabs for single-target schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const { queryByTestId } = render(<ExampleDataLayer schema={schema} />);
    expect(queryByTestId('target-tabs')).toBeNull();
  });
});

describe('findClearableProperties', () => {
  it('should return an empty array when schema is empty, null, or has no properties', () => {
    expect(findClearableProperties({})).toEqual([]);
    expect(findClearableProperties({ type: 'object' })).toEqual([]);
    expect(findClearableProperties(null)).toEqual([]);
    expect(findClearableProperties(undefined)).toEqual([]);
  });

  it('should return properties with "x-gtm-clear": true', () => {
    const schema = {
      properties: {
        prop1: { type: 'string' },
        prop2: { 'x-gtm-clear': true, type: 'object' },
        prop3: { 'x-gtm-clear': false, type: 'object' },
        prop4: { 'x-gtm-clear': true, type: 'array' },
      },
    };
    expect(findClearableProperties(schema)).toEqual(['prop2', 'prop4']);
  });
});

describe('target selection helpers', () => {
  afterEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
  });

  it('reads target from hash', () => {
    window.location.hash = '#target=android-firebase-java-sdk';
    expect(readHashTarget()).toBe('android-firebase-java-sdk');
  });

  it('reads target from search', () => {
    expect(readSearchTarget('?target=android-firebase-java-sdk')).toBe(
      'android-firebase-java-sdk',
    );
  });

  it('persistTarget writes hash without duplicate query target', () => {
    const originalReplaceState = window.history.replaceState;
    const replaceSpy = jest.fn();
    window.history.replaceState = replaceSpy;
    window.history.pushState(
      {},
      '',
      '/next/event-reference/purchase-event?target=android-firebase-kotlin-sdk',
    );

    const schema = {
      type: 'object',
      'x-tracking-targets': ['web-datalayer-js', 'android-firebase-kotlin-sdk'],
      properties: {
        event: { type: 'string', examples: ['purchase'] },
      },
    };

    render(<ExampleDataLayer schema={schema} />);
    expect(replaceSpy).toHaveBeenCalled();
    const lastCallUrl =
      replaceSpy.mock.calls[replaceSpy.mock.calls.length - 1][2];
    expect(lastCallUrl).toContain('#target=android-firebase-kotlin-sdk');
    expect(lastCallUrl).not.toContain('?target=android-firebase-kotlin-sdk');

    window.history.replaceState = originalReplaceState;
  });

  it('prefers hash over localStorage for initial target resolution', () => {
    const targets = [
      { id: 'web-datalayer-js' },
      { id: 'android-firebase-java-sdk' },
    ];
    window.localStorage.setItem(TARGET_STORAGE_KEY, 'web-datalayer-js');
    window.location.hash = '#target=android-firebase-java-sdk';

    expect(resolveInitialTargetId(targets)).toBe('android-firebase-java-sdk');
  });

  it('falls back to first target when hash is unknown', () => {
    const targets = [
      { id: 'web-datalayer-js' },
      { id: 'android-firebase-java-sdk' },
    ];
    window.location.hash = '#target=unknown';

    expect(resolveInitialTargetId(targets)).toBe('web-datalayer-js');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExampleDataLayer, { findClearableProperties } from '../components/ExampleDataLayer';
import choiceEventSchema from './__fixtures__/static/schemas/choice-event.json';

// Mock the CodeBlock to make assertions on its content easier
jest.mock('@theme/CodeBlock', () => {
    return function CodeBlock({ children, language }) {
        return <pre data-language={language}>{children}</pre>;
    };
});

jest.mock('@theme/Tabs', () => {
    return function Tabs({ children }) {
        return <div data-testid="tabs">{children}</div>;
    };
});

jest.mock('@theme/TabItem', () => {
    return function TabItem({ children, label }) {
        return <div data-testid="tab-item" data-label={label}>{children}</div>;
    };
});

describe('ExampleDataLayer', () => {
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
      <ExampleDataLayer schema={choiceEventSchema} />
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
            }
        };
        expect(findClearableProperties(schema)).toEqual(['prop2', 'prop4']);
    });
});

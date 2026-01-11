import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExampleDataLayer, { findClearableProperties } from '../components/ExampleDataLayer';

jest.mock('@theme/CodeBlock', () => {
    return function CodeBlock({ children }) {
        return <pre>{children}</pre>;
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
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render correctly with a simple schema', () => {
        const schema = {
            type: 'object',
            properties: {
                event: { type: 'string', examples: ['test_event'] },
            },
        };

        const { container } = render(<ExampleDataLayer schema={schema} />);

        const codeElement = container.querySelector('pre');
        expect(codeElement.textContent).toMatchInlineSnapshot(`
"window.dataLayer.push({
  "event": "test_event"
});"
`);
    });

    it('should render correctly with properties to reset', () => {
        const schema = {
            type: 'object',
            properties: {
                ecommerce: {
                    'x-gtm-clear': true,
                    type: 'object',
                    properties: { items: { type: 'array', examples: [[{ item_name: 'donuts' }]] } },
                },
                user_id: { type: 'string', examples: ['123'] }
            },
        };

        const { container } = render(<ExampleDataLayer schema={schema} />);

        const codeElement = container.querySelector('pre');
        expect(codeElement.textContent).toMatchInlineSnapshot(`
"window.dataLayer.push({
  "ecommerce": null
});
window.dataLayer.push({
  "ecommerce": {
    "items": [
      {
        "item_name": "donuts"
      }
    ]
  },
  "user_id": "123"
});"
`);
    });

    it('should render correctly with an empty schema', () => {
        const schema = {};

        const { container } = render(<ExampleDataLayer schema={schema} />);

        const codeElement = container.querySelector('pre');
        expect(codeElement.textContent).toMatchInlineSnapshot(`"window.dataLayer.push({});"`);
    });

    it('should render pure examples for multiple oneOf/anyOf properties', () => {
        const schema = {
            type: 'object',
            properties: {
                user_id: {
                    description: "The user's ID.",
                    oneOf: [
                        {
                            type: 'string',
                            title: 'User ID as String',
                            examples: ['user-123'],
                        },
                        {
                            type: 'integer',
                            title: 'User ID as Integer',
                            examples: [123],
                        },
                    ],
                },
                payment_method: {
                    description: "The user's payment method.",
                    anyOf: [
                        {
                            title: 'Credit Card',
                            type: 'object',
                            properties: {
                                card_number: {
                                    type: 'string',
                                    examples: ['1234-5678-9012-3456'],
                                },
                            },
                        },
                        {
                            title: 'PayPal',
                            type: 'object',
                            properties: {
                                email: {
                                    type: 'string',
                                    examples: ['test@example.com'],
                                },
                            },
                        },
                    ],
                },
            },
        };

        const { getAllByTestId } = render(<ExampleDataLayer schema={schema} />);

        const tabItems = getAllByTestId('tab-item');
        expect(tabItems).toHaveLength(4);

        // Check tabs for user_id
        expect(tabItems[0].textContent).toMatchInlineSnapshot(`
"window.dataLayer.push({
  "user_id": "user-123"
});"
`);
        expect(tabItems[1].textContent).toMatchInlineSnapshot(`
"window.dataLayer.push({
  "user_id": 123
});"
`);

        // Check tabs for payment_method
        expect(tabItems[2].textContent).toMatchInlineSnapshot(`
"window.dataLayer.push({
  "payment_method": {
    "card_number": "1234-5678-9012-3456"
  }
});"
`);
        expect(tabItems[3].textContent).toMatchInlineSnapshot(`
"window.dataLayer.push({
  "payment_method": {
    "email": "test@example.com"
  }
});"
`);
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

    it('should return an empty array if no properties have "x-gtm-clear": true', () => {
        const schema = {
            properties: {
                prop1: { type: 'string' },
                prop2: { type: 'object' },
                prop3: { 'x-gtm-clear': false, type: 'object' },
            }
        };
        expect(findClearableProperties(schema)).toEqual([]);
    });
});

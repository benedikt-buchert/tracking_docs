import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExampleDataLayer, { findClearableProperties } from '../components/ExampleDataLayer';
import buildExampleFromSchema from '../helpers/buildExampleFromSchema';

jest.mock('../helpers/buildExampleFromSchema', () => jest.fn());

jest.mock('@theme/CodeBlock', () => {
    return function CodeBlock({ children }) {
        return <pre>{children}</pre>;
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
        const example = { event: 'test_event' };
        buildExampleFromSchema.mockReturnValue(example);

        const { container } = render(<ExampleDataLayer schema={schema} />);

        expect(buildExampleFromSchema).toHaveBeenCalledWith(schema);
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
                    properties: { items: { type: 'array' } },
                },
                user_id: { type: 'string' }
            },
        };
        const example = {
            ecommerce: { items: [{ item_name: 'donuts' }] },
            user_id: '123'
        };
        buildExampleFromSchema.mockReturnValue(example);

        const { container } = render(<ExampleDataLayer schema={schema} />);

        expect(buildExampleFromSchema).toHaveBeenCalledWith(schema);

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
        const example = {};
        buildExampleFromSchema.mockReturnValue(example);

        const { container } = render(<ExampleDataLayer schema={schema} />);

        expect(buildExampleFromSchema).toHaveBeenCalledWith(schema);
        const codeElement = container.querySelector('pre');
        expect(codeElement.textContent).toMatchInlineSnapshot(`"window.dataLayer.push({});"`);
    });

    it('should not reset properties that are not in the final example', () => {
        const schema = {
            type: 'object',
            properties: {
                ecommerce: {
                    'x-gtm-clear': true,
                    type: 'object',
                    properties: { items: { type: 'array' } },
                },
                user_data: {
                    'x-gtm-clear': true,
                    type: 'object'
                },
                event: { type: 'string' }
            },
        };
        // buildExampleFromSchema will not include user_data because it's an empty object
        const example = {
            ecommerce: { items: [{ item_name: 'donuts' }] },
            event: 'purchase'
        };
        buildExampleFromSchema.mockReturnValue(example);

        const { container } = render(<ExampleDataLayer schema={schema} />);

        expect(buildExampleFromSchema).toHaveBeenCalledWith(schema);

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
  "event": "purchase"
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

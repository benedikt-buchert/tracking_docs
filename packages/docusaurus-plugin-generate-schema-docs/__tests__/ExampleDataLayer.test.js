import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExampleDataLayer, { findComplexPropertiesToReset } from '../components/ExampleDataLayer';
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
                event: { type: 'string', example: 'test_event' },
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
});

describe('findComplexPropertiesToReset', () => {
    it('should return an empty array when schema is empty, null, or has no properties', () => {
        expect(findComplexPropertiesToReset({})).toEqual([]);
        expect(findComplexPropertiesToReset({ type: 'object' })).toEqual([]);
        expect(findComplexPropertiesToReset(null)).toEqual([]);
        expect(findComplexPropertiesToReset(undefined)).toEqual([]);
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
        expect(findComplexPropertiesToReset(schema)).toEqual(['prop2', 'prop4']);
    });

    it('should return an empty array if no properties have "x-gtm-clear": true', () => {
        const schema = {
            properties: {
                prop1: { type: 'string' },
                prop2: { type: 'object' },
                prop3: { 'x-gtm-clear': false, type: 'object' },
            }
        };
        expect(findComplexPropertiesToReset(schema)).toEqual([]);
    });
});

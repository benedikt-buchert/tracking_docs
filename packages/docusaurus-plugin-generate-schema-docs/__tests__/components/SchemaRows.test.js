import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import SchemaRows from '../../components/SchemaRows';

// Mock child components
jest.mock('../../components/PropertyRow', () => (props) => <tr><td>Mocked PropertyRow: {props.propertyKey}</td></tr>);
jest.mock('../../components/TableHeader', () => () => <thead><tr><th>Mocked TableHeader</th></tr></thead>);

describe('SchemaRows', () => {
    it('renders a PropertyRow for each property', () => {
        const properties = {
            name: { type: 'string' },
            age: { type: 'integer' },
        };
        const { getByText } = render(
            <table>
                <tbody>
                    <SchemaRows properties={properties} getConstraints={() => []} />
                </tbody>
            </table>
        );

        expect(getByText('Mocked PropertyRow: name')).toBeInTheDocument();
        expect(getByText('Mocked PropertyRow: age')).toBeInTheDocument();
    });

    it('recursively renders for nested objects', () => {
        const properties = {
            user: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                },
            },
        };
        const { getByText } = render(
            <table>
                <tbody>
                    <SchemaRows properties={properties} getConstraints={() => []} />
                </tbody>
            </table>
        );

        expect(getByText('Mocked PropertyRow: user')).toBeInTheDocument();
        expect(getByText('Mocked TableHeader')).toBeInTheDocument();
        expect(getByText('user { }')).toBeInTheDocument();
        // This will be inside the nested table
        expect(getByText('Mocked PropertyRow: name')).toBeInTheDocument();
    });

    it('recursively renders for nested arrays of objects', () => {
        const properties = {
            products: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        price: { type: 'number' },
                    },
                },
            },
        };
        const { getByText } = render(
            <table>
                <tbody>
                    <SchemaRows properties={properties} getConstraints={() => []} />
                </tbody>
            </table>
        );

        expect(getByText('Mocked PropertyRow: products')).toBeInTheDocument();
        expect(getByText('Mocked TableHeader')).toBeInTheDocument();
        expect(getByText('products [ ]')).toBeInTheDocument();
        // These will be inside the nested table
        expect(getByText('Mocked PropertyRow: name')).toBeInTheDocument();
        expect(getByText('Mocked PropertyRow: price')).toBeInTheDocument();
    });
});

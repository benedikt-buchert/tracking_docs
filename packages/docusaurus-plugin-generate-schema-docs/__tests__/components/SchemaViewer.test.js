import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import SchemaViewer from '../../components/SchemaViewer';

// Mock child components

jest.mock('../../components/ExampleDataLayer', () => () => <div>Mocked ExampleDataLayer</div>);
jest.mock('../../components/PropertiesTable', () => () => <div>Mocked PropertiesTable</div>);

describe('SchemaViewer', () => {
    it('renders the schema viewer with all child components', () => {
        const schema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
            },
        };

        const { getByText } = render(<SchemaViewer schema={schema} />);

        expect(getByText('DataLayer Example')).toBeInTheDocument();
        expect(getByText('Mocked ExampleDataLayer')).toBeInTheDocument();
        expect(getByText('Event Properties')).toBeInTheDocument();
        expect(getByText('Mocked PropertiesTable')).toBeInTheDocument();
    });
});

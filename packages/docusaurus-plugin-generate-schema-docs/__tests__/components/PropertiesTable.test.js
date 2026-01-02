import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import PropertiesTable from '../../components/PropertiesTable';

// Mock child components
jest.mock('../../components/TableHeader', () => () => <thead><tr><th>Mocked TableHeader</th></tr></thead>);
jest.mock('../../components/SchemaRows', () => () => <tr><td>Mocked SchemaRows</td></tr>);

describe('PropertiesTable', () => {
    it('renders the table with header and schema rows', () => {
        const schema = {
            properties: {
                name: { type: 'string' },
            },
            required: ['name'],
        };

        const { getByText } = render(<PropertiesTable schema={schema} />);

        expect(getByText('Mocked TableHeader')).toBeInTheDocument();
        expect(getByText('Mocked SchemaRows')).toBeInTheDocument();
    });
});

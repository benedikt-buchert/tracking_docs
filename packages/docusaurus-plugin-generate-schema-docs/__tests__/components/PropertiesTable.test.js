import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import PropertiesTable from '../../components/PropertiesTable';

jest.mock('../../components/TableHeader', () => {
  const MockTableHeader = () => (
    <thead>
      <tr>
        <th>Mocked TableHeader</th>
      </tr>
    </thead>
  );
  MockTableHeader.displayName = 'MockTableHeader';
  return MockTableHeader;
});
jest.mock('../../components/SchemaRows', () => {
  const MockSchemaRows = () => (
    <tr>
      <td>Mocked SchemaRows</td>
    </tr>
  );
  MockSchemaRows.displayName = 'MockSchemaRows';
  return MockSchemaRows;
});

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

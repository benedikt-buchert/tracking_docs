import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PropertiesTable from '../../components/PropertiesTable';
import { schemaToTableData } from '../../helpers/schemaToTableData';

jest.mock('../../helpers/schemaToTableData', () => ({
  schemaToTableData: jest.fn(() => []),
}));

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
jest.mock('../../components/WordWrapButton', () => {
  const MockWordWrapButton = ({ onClick }) => (
    <button onClick={onClick}>Toggle word wrap</button>
  );
  MockWordWrapButton.displayName = 'MockWordWrapButton';
  return MockWordWrapButton;
});

describe('PropertiesTable', () => {
  beforeEach(() => {
    schemaToTableData.mockClear();
  });

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

  it('filters out inherited top-level properties without description or examples', () => {
    const schema = {
      properties: {
        event: { type: 'string' },
        items: { type: 'array' },
      },
      required: ['event'],
    };
    const sourceSchema = {
      properties: {
        event: { type: 'string' },
      },
    };

    render(<PropertiesTable schema={schema} sourceSchema={sourceSchema} />);

    expect(schemaToTableData).toHaveBeenCalledWith({
      ...schema,
      properties: {
        event: { type: 'string' },
      },
    });
  });

  it('keeps inherited top-level properties when they include documentation fields', () => {
    const schema = {
      properties: {
        event: { type: 'string' },
        app_version: {
          type: 'string',
          description: 'Shared app version for all mobile events.',
          examples: ['1.2.3'],
        },
      },
      required: ['event'],
    };
    const sourceSchema = {
      properties: {
        event: { type: 'string' },
      },
    };

    render(<PropertiesTable schema={schema} sourceSchema={sourceSchema} />);

    expect(schemaToTableData).toHaveBeenCalledWith({
      ...schema,
      properties: {
        event: { type: 'string' },
        app_version: {
          type: 'string',
          description: 'Shared app version for all mobile events.',
          examples: ['1.2.3'],
        },
      },
    });
  });

  it('toggles word wrap when the button is clicked', () => {
    const schema = {
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };
    const { container, getByRole } = render(
      <PropertiesTable schema={schema} />,
    );

    expect(container.firstChild).not.toHaveClass('noWordWrap');

    // Find the button
    const toggleButton = getByRole('button', { name: /toggle word wrap/i });
    expect(toggleButton).toBeInTheDocument();

    // Click the button to disable word wrap
    fireEvent.click(toggleButton);
    expect(container.firstChild).toHaveClass('noWordWrap');

    // Click the button again to enable word wrap
    fireEvent.click(toggleButton);
    expect(container.firstChild).not.toHaveClass('noWordWrap');
  });
});

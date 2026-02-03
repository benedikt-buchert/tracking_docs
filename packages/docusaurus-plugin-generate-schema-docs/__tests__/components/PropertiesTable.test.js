import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
jest.mock('../../components/WordWrapButton', () => {
  const MockWordWrapButton = ({ onClick }) => (
    <button onClick={onClick}>Toggle word wrap</button>
  );
  MockWordWrapButton.displayName = 'MockWordWrapButton';
  return MockWordWrapButton;
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

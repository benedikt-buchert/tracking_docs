import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConditionalRows from '../../components/ConditionalRows';

jest.mock('../../components/SchemaRows', () => {
  const MockSchemaRows = (props) => (
    <tr data-testid="schema-rows">
      <td>{JSON.stringify(props.tableData)}</td>
    </tr>
  );
  MockSchemaRows.displayName = 'MockSchemaRows';
  return MockSchemaRows;
});

describe('ConditionalRows', () => {
  const conditionalRow = {
    type: 'conditional',
    path: ['if/then/else'],
    level: 0,
    continuingLevels: [],
    condition: {
      title: 'If',
      description: 'When country is US',
      rows: [{ name: 'country', isCondition: true }],
    },
    branches: [
      {
        title: 'Then',
        description: 'US-specific fields',
        rows: [{ name: 'postal_code' }],
      },
      {
        title: 'Else',
        description: 'Non-US fields',
        rows: [{ name: 'province' }],
      },
    ],
  };

  it('renders condition (if) rows always visible', () => {
    render(
      <table>
        <tbody>
          <ConditionalRows row={conditionalRow} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('If')).toBeInTheDocument();
    expect(
      screen.getByText(
        JSON.stringify([{ name: 'country', isCondition: true }]),
      ),
    ).toBeInTheDocument();
  });

  it('shows Then branch by default', () => {
    render(
      <table>
        <tbody>
          <ConditionalRows row={conditionalRow} />
        </tbody>
      </table>,
    );

    expect(
      screen.getByText(JSON.stringify([{ name: 'postal_code' }])),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(JSON.stringify([{ name: 'province' }])),
    ).not.toBeInTheDocument();
  });

  it('switches to Else branch when clicked', () => {
    render(
      <table>
        <tbody>
          <ConditionalRows row={conditionalRow} />
        </tbody>
      </table>,
    );

    // Click the Else toggle
    fireEvent.click(screen.getByText('Else'));

    // Now Else should be visible and Then should be hidden
    expect(
      screen.queryByText(JSON.stringify([{ name: 'postal_code' }])),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(JSON.stringify([{ name: 'province' }])),
    ).toBeInTheDocument();
  });

  it('renders condition description when present', () => {
    render(
      <table>
        <tbody>
          <ConditionalRows row={conditionalRow} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('When country is US')).toBeInTheDocument();
  });

  it('applies correct indentation for nested levels', () => {
    const nestedRow = {
      ...conditionalRow,
      level: 2,
      continuingLevels: [0],
    };

    const { container } = render(
      <table>
        <tbody>
          <ConditionalRows row={nestedRow} />
        </tbody>
      </table>,
    );

    const cells = container.querySelectorAll('td[colspan="5"]');
    // level 2: 2 * 1.25 + 0.5 = 3rem
    cells.forEach((cell) => {
      expect(cell.style.paddingLeft).toBe('3rem');
    });
  });

  it('handles conditional with only Then branch (no Else)', () => {
    const rowWithoutElse = {
      ...conditionalRow,
      branches: [conditionalRow.branches[0]],
    };

    render(
      <table>
        <tbody>
          <ConditionalRows row={rowWithoutElse} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Then')).toBeInTheDocument();
    expect(screen.queryByText('Else')).not.toBeInTheDocument();
    expect(
      screen.getByText(JSON.stringify([{ name: 'postal_code' }])),
    ).toBeInTheDocument();
  });
});

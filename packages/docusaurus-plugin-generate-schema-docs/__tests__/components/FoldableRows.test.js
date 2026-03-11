import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import FoldableRows from '../../components/FoldableRows';

jest.mock('../../components/SchemaRows', () => {
  const MockSchemaRows = (props) => (
    <tr data-testid="schema-rows">
      <td>{JSON.stringify(props.tableData)}</td>
    </tr>
  );
  MockSchemaRows.displayName = 'MockSchemaRows';
  return MockSchemaRows;
});

jest.mock('@theme/Heading', () => {
  const MockHeading = ({ as: Tag = 'h4', children, className }) => (
    <Tag className={className}>{children}</Tag>
  );
  MockHeading.displayName = 'MockHeading';
  return MockHeading;
});

describe('FoldableRows', () => {
  const choiceRow = {
    type: 'choice',
    choiceType: 'oneOf',
    description: 'Choose one payment type.',
    name: 'payment',
    level: 0,
    continuingLevels: [],
    options: [
      {
        title: 'Credit Card',
        description: 'Card payment.',
        rows: [{ name: 'card_number' }],
      },
      {
        title: 'PayPal',
        description: 'PayPal payment.',
        rows: [{ name: 'email' }],
      },
    ],
  };

  it('keeps choice headers and toggles neutral instead of zebra-striped', () => {
    render(
      <table>
        <tbody>
          <FoldableRows
            row={choiceRow}
            stripeIndex={1}
            stripeState={{ current: 2 }}
          />
        </tbody>
      </table>,
    );

    const headerRow = screen
      .getByText((content) =>
        content.includes('Select one of the following options:'),
      )
      .closest('tr');
    const firstToggleRow = screen.getByText('Credit Card').closest('tr');
    const secondToggleRow = screen.getByText('PayPal').closest('tr');

    expect(headerRow).toHaveClass('schema-row--control');
    expect(firstToggleRow).toHaveClass('schema-row--control');
    expect(secondToggleRow).toHaveClass('schema-row--control');
    expect(headerRow).not.toHaveClass('schema-row--zebra-even');
    expect(firstToggleRow).not.toHaveClass('schema-row--zebra-even');
    expect(secondToggleRow).not.toHaveClass('schema-row--zebra-even');
  });
});

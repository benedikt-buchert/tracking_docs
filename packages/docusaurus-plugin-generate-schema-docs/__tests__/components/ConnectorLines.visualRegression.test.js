import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FoldableRows from '../../components/FoldableRows';
import ConditionalRows from '../../components/ConditionalRows';
import SchemaRows from '../../components/SchemaRows';
import { schemaToTableData } from '../../helpers/schemaToTableData';
import battleTestSchema from '../__fixtures__/static/schemas/battle-test-event.json';

const renderInTable = (ui) =>
  render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  );

const getPropertyCellByName = (container, name) => {
  const strongEls = Array.from(
    container.querySelectorAll('span.property-name > strong'),
  );
  const strong = strongEls.find((el) => el.textContent === name);
  return strong?.closest('td');
};

const getPropertyCellsByName = (container, name) =>
  Array.from(container.querySelectorAll('span.property-name > strong'))
    .filter((el) => el.textContent === name)
    .map((el) => el.closest('td'));

describe('connector lines visual regressions', () => {
  const rows = schemaToTableData(battleTestSchema);

  it('keeps user_id option row open when user conditional follows', () => {
    const userIdChoice = rows.find(
      (row) => row.type === 'choice' && row.name === 'user_id',
    );

    const { container } = renderInTable(<FoldableRows row={userIdChoice} />);
    fireEvent.click(screen.getByText('Integer ID'));

    const userIdCell = getPropertyCellByName(container, 'user_id');
    expect(userIdCell).toBeInTheDocument();
    expect(userIdCell).not.toHaveClass('is-last');
    expect(userIdCell.outerHTML).toMatchSnapshot();
  });

  it('keeps wallet_provider option row open when wallet_email follows', () => {
    const paymentChoice = rows.find(
      (row) =>
        row.type === 'choice' &&
        row.path[0] === 'payment' &&
        row.choiceType === 'anyOf',
    );
    const digitalWallet = paymentChoice.options.find(
      (option) => option.title === 'Digital Wallet',
    );
    const walletProviderChoice = digitalWallet.rows.find(
      (row) => row.type === 'choice' && row.name === 'wallet_provider',
    );

    const { container } = renderInTable(
      <FoldableRows row={walletProviderChoice} />,
    );
    fireEvent.click(screen.getByText('Custom Provider'));

    const walletProviderCell = getPropertyCellByName(
      container,
      'wallet_provider',
    );
    expect(walletProviderCell).toBeInTheDocument();
    expect(walletProviderCell).not.toHaveClass('is-last');
    expect(walletProviderCell.outerHTML).toMatchSnapshot();
  });

  it('keeps cvv row open when payment choice has following options', () => {
    const paymentChoice = rows.find(
      (row) =>
        row.type === 'choice' &&
        row.path[0] === 'payment' &&
        row.choiceType === 'anyOf',
    );
    const creditCard = paymentChoice.options.find(
      (option) => option.title === 'Credit Card',
    );
    const cardConditional = creditCard.rows.find(
      (row) => row.type === 'conditional',
    );

    const { container } = renderInTable(
      <ConditionalRows row={cardConditional} />,
    );
    fireEvent.click(screen.getByText('Else'));

    const cvvCell = getPropertyCellByName(container, 'cvv');
    expect(cvvCell).toBeInTheDocument();
    expect(cvvCell).not.toHaveClass('is-last');
    expect(cvvCell.outerHTML).toMatchSnapshot();
  });

  it('keeps ancestor connector open through the last nested object before a root sibling', () => {
    const schema = {
      properties: {
        branch_group: {
          type: 'object',
          properties: {
            first_nested_branch: {
              type: 'object',
              properties: {
                leaf_value: { type: 'string' },
              },
            },
            last_nested_branch: {
              type: 'object',
              properties: {
                leaf_value: { type: 'string' },
              },
            },
          },
        },
        sibling_after_group: { type: 'array', items: { type: 'object' } },
      },
    };
    const tableData = schemaToTableData(schema);

    const { container } = renderInTable(<SchemaRows tableData={tableData} />);

    const lastNestedBranchCell = getPropertyCellByName(
      container,
      'last_nested_branch',
    );
    expect(lastNestedBranchCell).toBeInTheDocument();
    expect(lastNestedBranchCell).toHaveStyle({
      backgroundPosition: expect.stringContaining('0.5rem top'),
    });

    const leafCells = getPropertyCellsByName(container, 'leaf_value');
    expect(leafCells).toHaveLength(2);
    expect(leafCells[1]).toHaveStyle({
      backgroundPosition: expect.stringContaining('0.5rem top'),
    });
  });

  it('keeps nested sibling connectors open through leaf rows', () => {
    const nestedLeafSchema = {
      type: 'object',
      properties: {
        nested_leaf_holder: {
          type: 'object',
          properties: {
            leaf_value: { type: 'string' },
          },
        },
      },
    };
    const shallowLeafSchema = {
      type: 'object',
      properties: {
        shallow_value: { type: 'string' },
      },
    };
    const schema = {
      properties: {
        first_group: {
          type: 'object',
          properties: {
            first_branch: nestedLeafSchema,
            middle_branch: nestedLeafSchema,
            last_branch: nestedLeafSchema,
          },
        },
        second_group: {
          type: 'object',
          properties: {
            first_branch: shallowLeafSchema,
            middle_branch: shallowLeafSchema,
            penultimate_branch: shallowLeafSchema,
            last_branch: shallowLeafSchema,
          },
        },
      },
    };
    const tableData = schemaToTableData(schema);

    const { container } = renderInTable(<SchemaRows tableData={tableData} />);

    const leafCells = getPropertyCellsByName(container, 'leaf_value');
    expect(leafCells).toHaveLength(3);
    expect(leafCells[0]).toHaveStyle({
      backgroundPosition: expect.stringContaining('0.5rem top'),
    });
    expect(leafCells[0]).toHaveStyle({
      backgroundPosition: expect.stringContaining('1.75rem top'),
    });
    expect(leafCells[1]).toHaveStyle({
      backgroundPosition: expect.stringContaining('0.5rem top'),
    });
    expect(leafCells[1]).toHaveStyle({
      backgroundPosition: expect.stringContaining('1.75rem top'),
    });

    const shallowValueCells = getPropertyCellsByName(
      container,
      'shallow_value',
    );
    expect(shallowValueCells).toHaveLength(4);
    expect(shallowValueCells[0]).toHaveStyle({
      backgroundPosition: expect.stringContaining('0.5rem top'),
    });
    expect(shallowValueCells[1]).toHaveStyle({
      backgroundPosition: expect.stringContaining('0.5rem top'),
    });
  });
});

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FoldableRows from '../../components/FoldableRows';
import ConditionalRows from '../../components/ConditionalRows';
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

    const walletProviderCell = getPropertyCellByName(container, 'wallet_provider');
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

    const { container } = renderInTable(<ConditionalRows row={cardConditional} />);
    fireEvent.click(screen.getByText('Else'));

    const cvvCell = getPropertyCellByName(container, 'cvv');
    expect(cvvCell).toBeInTheDocument();
    expect(cvvCell).not.toHaveClass('is-last');
    expect(cvvCell.outerHTML).toMatchSnapshot();
  });
});

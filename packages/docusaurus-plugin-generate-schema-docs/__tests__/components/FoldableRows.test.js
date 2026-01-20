import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FoldableRows from '../../components/FoldableRows';

// Mock child components and theme components
jest.mock('../../components/SchemaRows', () => (props) => (
  // The mock needs to return a valid element to be a child of a tbody
  // We'll use a data-testid to check for its presence.
  <tr data-testid="schema-rows">
    <td>{JSON.stringify(props.tableData)}</td>
  </tr>
));
jest.mock('@theme/Heading', () => ({ children }) => <h4>{children}</h4>);

describe('FoldableRows', () => {
  const oneOfRow = {
    type: 'choice',
    choiceType: 'oneOf',
    path: ['payment'],
    level: 1,
    description: 'Select one payment method:',
    options: [
      { title: 'Credit Card', description: 'Pay with card', rows: [{ name: 'cardNumber' }] },
      { title: 'PayPal', description: 'Pay with PayPal', rows: [{ name: 'email' }] },
    ],
  };

  const anyOfRow = {
    type: 'choice',
    choiceType: 'anyOf',
    path: ['contact'],
    level: 1,
    description: 'Select any contact method:',
    options: [
      { title: 'Email', description: 'Contact via email', rows: [{ name: 'email_address' }] },
      { title: 'Phone', description: 'Contact via phone', rows: [{ name: 'phone_number' }] },
    ],
  };

  it('renders oneOf as a radio-style accordion', () => {
    render(
      <table>
        <tbody>
          <FoldableRows row={oneOfRow} />
        </tbody>
      </table>
    );

    const creditCardToggle = screen.getByText('Credit Card');
    const paypalToggle = screen.getByText('PayPal');

    // Initially, first option is open
    expect(screen.getByText(JSON.stringify([{ name: 'cardNumber' }]))).toBeInTheDocument();
    expect(screen.queryByText(JSON.stringify([{ name: 'email' }]))).not.toBeInTheDocument();

    // Click the second option
    fireEvent.click(paypalToggle);

    // Now, second option should be open and first should be closed
    expect(screen.queryByText(JSON.stringify([{ name: 'cardNumber' }]))).not.toBeInTheDocument();
    expect(screen.getByText(JSON.stringify([{ name: 'email' }]))).toBeInTheDocument();
  });

  it('renders anyOf as a checkbox-style accordion', () => {
    render(
      <table>
        <tbody>
          <FoldableRows row={anyOfRow} />
        </tbody>
      </table>
    );

    const emailToggle = screen.getByText('Email');
    const phoneToggle = screen.getByText('Phone');

    // Initially, nothing is open
    expect(screen.queryByTestId('schema-rows')).not.toBeInTheDocument();

    // Click the first option
    fireEvent.click(emailToggle);
    expect(screen.getByText(JSON.stringify([{ name: 'email_address' }]))).toBeInTheDocument();
    expect(screen.queryByText(JSON.stringify([{ name: 'phone_number' }]))).not.toBeInTheDocument();

    // Click the second option
    fireEvent.click(phoneToggle);
    expect(screen.getByText(JSON.stringify([{ name: 'email_address' }]))).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify([{ name: 'phone_number' }]))).toBeInTheDocument();

    // Click the first option again to close it
    fireEvent.click(emailToggle);
    expect(screen.queryByText(JSON.stringify([{ name: 'email_address' }]))).not.toBeInTheDocument();
    expect(screen.getByText(JSON.stringify([{ name: 'phone_number' }]))).toBeInTheDocument();
  });
});

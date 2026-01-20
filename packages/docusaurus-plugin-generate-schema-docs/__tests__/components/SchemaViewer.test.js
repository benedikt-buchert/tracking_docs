import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SchemaViewer from '../../components/SchemaViewer';
import choiceEventSchema from '../__fixtures__/schemas/choice-event.json';

// Mock the CodeBlock component as it's not relevant to this test
jest.mock('@theme/CodeBlock', () => {
  return ({ children }) => <pre>{children}</pre>;
});

// Mock the Heading component
jest.mock('@theme/Heading', () => {
  return ({ as: Component, ...props }) => <Component {...props} />;
});


describe('SchemaViewer', () => {
  it('renders complex schema with payment_method and required indicators', () => {
    render(<SchemaViewer schema={choiceEventSchema} />);

    // Check that payment_method property name is rendered within the table
    const table = screen.getByRole('table');
    expect(within(table).getByText('payment_method')).toBeInTheDocument();


    // Check that the "required" text is rendered for the user_id choice
    const userIdChoiceHeader = screen.getByText(
      (content, element) =>
        element.tagName.toLowerCase() === 'h4' && content.includes('Select one of the following options:'),
    );
    expect(userIdChoiceHeader).toBeInTheDocument();

    // The required text is rendered as a 'required' constraint code block.
    // We expect it for 'event', 'user_id', and 'payment_method' at the top level.
    const requiredConstraints = within(table).getAllByText('required');

    // There should be at least 3 required constraints visible at the top level.
    expect(requiredConstraints.length).toBeGreaterThanOrEqual(3);
  });
});

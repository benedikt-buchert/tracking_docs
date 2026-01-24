import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FoldableRows from '../../components/FoldableRows';

jest.mock('../../components/SchemaRows', () => {
  const MockSchemaRows = (props) => (
    // The mock needs to return a valid element to be a child of a tbody
    // We'll use a data-testid to check for its presence.
    <tr data-testid="schema-rows">
      <td>{JSON.stringify(props.tableData)}</td>
    </tr>
  );
  MockSchemaRows.displayName = 'MockSchemaRows';
  return MockSchemaRows;
});

jest.mock('@theme/Heading', () => {
  const MockHeading = ({ as: Component, children, ...props }) => (
    <Component {...props}>{children}</Component>
  );
  MockHeading.displayName = 'MockHeading';
  return MockHeading;
});

describe('FoldableRows', () => {
  const oneOfRow = {
    type: 'choice',
    choiceType: 'oneOf',
    path: ['payment'],
    level: 1,
    description: 'Select one payment method:',
    options: [
      {
        title: 'Credit Card',
        description: 'Pay with card',
        rows: [{ name: 'cardNumber' }],
      },
      {
        title: 'PayPal',
        description: 'Pay with PayPal',
        rows: [{ name: 'email' }],
      },
    ],
  };

  const anyOfRow = {
    type: 'choice',
    choiceType: 'anyOf',
    path: ['contact'],
    level: 1,
    description: 'Select any contact method:',
    options: [
      {
        title: 'Email',
        description: 'Contact via email',
        rows: [{ name: 'email_address' }],
      },
      {
        title: 'Phone',
        description: 'Contact via phone',
        rows: [{ name: 'phone_number' }],
      },
    ],
  };

  it('renders oneOf as a radio-style accordion', () => {
    render(
      <table>
        <tbody>
          <FoldableRows row={oneOfRow} />
        </tbody>
      </table>,
    );

    const creditCardToggle = screen.getByText('Credit Card');
    const paypalToggle = screen.getByText('PayPal');

    // Initially, first option is open
    expect(
      screen.getByText(JSON.stringify([{ name: 'cardNumber' }])),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(JSON.stringify([{ name: 'email' }])),
    ).not.toBeInTheDocument();

    // Click the second option
    fireEvent.click(paypalToggle);

    // Now, second option should be open and first should be closed
    expect(
      screen.queryByText(JSON.stringify([{ name: 'cardNumber' }])),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(JSON.stringify([{ name: 'email' }])),
    ).toBeInTheDocument();
  });

  it('renders anyOf as a checkbox-style accordion', () => {
    render(
      <table>
        <tbody>
          <FoldableRows row={anyOfRow} />
        </tbody>
      </table>,
    );

    const emailToggle = screen.getByText('Email');
    const phoneToggle = screen.getByText('Phone');

    // Initially, nothing is open
    expect(screen.queryByTestId('schema-rows')).not.toBeInTheDocument();

    // Click the first option
    fireEvent.click(emailToggle);
    expect(
      screen.getByText(JSON.stringify([{ name: 'email_address' }])),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(JSON.stringify([{ name: 'phone_number' }])),
    ).not.toBeInTheDocument();

    // Click the second option
    fireEvent.click(phoneToggle);
    expect(
      screen.getByText(JSON.stringify([{ name: 'email_address' }])),
    ).toBeInTheDocument();
    expect(
      screen.getByText(JSON.stringify([{ name: 'phone_number' }])),
    ).toBeInTheDocument();

    // Click the first option again to close it
    fireEvent.click(emailToggle);
    expect(
      screen.queryByText(JSON.stringify([{ name: 'email_address' }])),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(JSON.stringify([{ name: 'phone_number' }])),
    ).toBeInTheDocument();
  });

  describe('hierarchical lines feature', () => {
    it('applies padding-left based on level using rem units', () => {
      const rowWithLevel = {
        type: 'choice',
        choiceType: 'oneOf',
        path: ['nested', 'payment'],
        level: 2,
        description: 'Nested choice',
        continuingLevels: [],
        options: [
          {
            title: 'Option A',
            description: 'First option',
            rows: [{ name: 'fieldA' }],
          },
        ],
      };

      const { container } = render(
        <table>
          <tbody>
            <FoldableRows row={rowWithLevel} />
          </tbody>
        </table>,
      );

      const cells = container.querySelectorAll('td[colspan="5"]');
      // level 2: 2 * 1.25 + 0.5 = 3rem
      cells.forEach((cell) => {
        expect(cell.style.paddingLeft).toBe('3rem');
      });
    });

    it('applies background-image for continuing ancestor lines', () => {
      const rowWithContinuingLevels = {
        type: 'choice',
        choiceType: 'anyOf',
        path: ['deeply', 'nested', 'choice'],
        level: 2,
        description: 'Choice with continuing lines',
        continuingLevels: [0], // Ancestor at level 0 has more siblings
        options: [
          {
            title: 'Option A',
            rows: [{ name: 'fieldA' }],
          },
        ],
      };

      const { container } = render(
        <table>
          <tbody>
            <FoldableRows row={rowWithContinuingLevels} />
          </tbody>
        </table>,
      );

      const cells = container.querySelectorAll('td[colspan="5"]');
      cells.forEach((cell) => {
        expect(cell.style.backgroundImage).toContain('linear-gradient');
      });
    });

    it('applies background-image for immediate parent level connection', () => {
      const rowWithParentLevel = {
        type: 'choice',
        choiceType: 'oneOf',
        path: ['parent', 'choice'],
        level: 1,
        description: 'Choice at level 1',
        continuingLevels: [],
        options: [
          {
            title: 'Option A',
            rows: [{ name: 'fieldA' }],
          },
        ],
      };

      const { container } = render(
        <table>
          <tbody>
            <FoldableRows row={rowWithParentLevel} />
          </tbody>
        </table>,
      );

      const cells = container.querySelectorAll('td[colspan="5"]');
      // Should have a line at parent level (level 0) position
      cells.forEach((cell) => {
        expect(cell.style.backgroundImage).toContain('linear-gradient');
      });
    });

    it('has no background-image for root level choices with no continuing levels', () => {
      const rootLevelRow = {
        type: 'choice',
        choiceType: 'oneOf',
        path: ['user_id'],
        level: 0,
        description: 'Root level choice',
        continuingLevels: [],
        options: [
          {
            title: 'Option A',
            rows: [{ name: 'fieldA' }],
          },
        ],
      };

      const { container } = render(
        <table>
          <tbody>
            <FoldableRows row={rootLevelRow} />
          </tbody>
        </table>,
      );

      const cells = container.querySelectorAll('td[colspan="5"]');
      cells.forEach((cell) => {
        expect(cell.style.backgroundImage).toBe('');
      });
    });

    it('combines multiple continuing levels in background-image', () => {
      const rowWithMultipleLevels = {
        type: 'choice',
        choiceType: 'anyOf',
        path: ['a', 'b', 'c', 'choice'],
        level: 3,
        description: 'Deeply nested choice',
        continuingLevels: [0, 1], // Multiple ancestors have siblings
        options: [
          {
            title: 'Option A',
            rows: [{ name: 'fieldA' }],
          },
        ],
      };

      const { container } = render(
        <table>
          <tbody>
            <FoldableRows row={rowWithMultipleLevels} />
          </tbody>
        </table>,
      );

      const cells = container.querySelectorAll('td[colspan="5"]');
      cells.forEach((cell) => {
        const bgImage = cell.style.backgroundImage;
        // Should have multiple gradients (one for each continuing level + parent)
        const gradientCount = (bgImage.match(/linear-gradient/g) || []).length;
        expect(gradientCount).toBeGreaterThanOrEqual(2);
      });
    });

    it('applies correct indentation for level 0', () => {
      const levelZeroRow = {
        type: 'choice',
        choiceType: 'oneOf',
        path: ['user_id'],
        level: 0,
        description: 'Level 0 choice',
        continuingLevels: [],
        options: [
          {
            title: 'Option A',
            rows: [{ name: 'fieldA' }],
          },
        ],
      };

      const { container } = render(
        <table>
          <tbody>
            <FoldableRows row={levelZeroRow} />
          </tbody>
        </table>,
      );

      const cells = container.querySelectorAll('td[colspan="5"]');
      // level 0: 0 * 1.25 + 0.5 = 0.5rem
      cells.forEach((cell) => {
        expect(cell.style.paddingLeft).toBe('0.5rem');
      });
    });
  });
});

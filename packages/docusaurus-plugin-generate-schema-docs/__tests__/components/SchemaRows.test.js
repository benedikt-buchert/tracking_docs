import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import SchemaRows from '../../components/SchemaRows';

// Mock child components
jest.mock('../../components/PropertyRow', () => {
  const MockPropertyRow = (props) => (
    <tr>
      <td>
        Mocked PropertyRow: {props.row.name} ({props.stripeIndex})
      </td>
    </tr>
  );
  MockPropertyRow.displayName = 'MockPropertyRow';
  return MockPropertyRow;
});

jest.mock('../../components/FoldableRows', () => {
  const MockFoldableRows = (props) => (
    <tr>
      <td>
        Mocked FoldableRows: {props.row.choiceType} ({props.stripeIndex},{' '}
        {String(!!props.stripeState)})
      </td>
    </tr>
  );
  MockFoldableRows.displayName = 'MockFoldableRows';
  return MockFoldableRows;
});

jest.mock('../../components/ConditionalRows', () => {
  const MockConditionalRows = (props) => (
    <tr>
      <td>
        Mocked ConditionalRows: {props.row.condition.title} ({props.stripeIndex}
        , {String(!!props.stripeState)})
      </td>
    </tr>
  );
  MockConditionalRows.displayName = 'MockConditionalRows';
  return MockConditionalRows;
});

describe('SchemaRows', () => {
  it('renders a PropertyRow for each property type item in tableData', () => {
    const tableData = [
      { type: 'property', name: 'name', path: ['name'] },
      { type: 'property', name: 'age', path: ['age'] },
    ];

    const { getByText } = render(
      <table>
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>,
    );

    expect(getByText('Mocked PropertyRow: name (0)')).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: age (1)')).toBeInTheDocument();
  });

  it('renders nested properties from a flat list', () => {
    const tableData = [
      { type: 'property', name: 'user', path: ['user'], level: 0 },
      { type: 'property', name: 'id', path: ['user', 'id'], level: 1 },
    ];

    const { getByText } = render(
      <table>
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>,
    );

    // It should render both the parent and child property from the flat list
    expect(getByText('Mocked PropertyRow: user (0)')).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: id (1)')).toBeInTheDocument();
  });

  it('renders a FoldableRows for choice type items in tableData', () => {
    const tableData = [
      {
        type: 'choice',
        choiceType: 'oneOf',
        path: ['choice'],
        options: [],
      },
    ];

    const { getByText } = render(
      <table>
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>,
    );

    expect(
      getByText('Mocked FoldableRows: oneOf (0, true)'),
    ).toBeInTheDocument();
  });

  it('renders a mix of properties and choices', () => {
    const tableData = [
      { type: 'property', name: 'prop1', path: ['prop1'] },
      {
        type: 'choice',
        choiceType: 'anyOf',
        path: ['choice'],
        options: [],
      },
      { type: 'property', name: 'prop2', path: ['prop2'] },
    ];

    const { getByText } = render(
      <table>
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>,
    );

    expect(getByText('Mocked PropertyRow: prop1 (0)')).toBeInTheDocument();
    expect(
      getByText('Mocked FoldableRows: anyOf (1, true)'),
    ).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: prop2 (2)')).toBeInTheDocument();
  });

  it('renders a ConditionalRows for conditional type items in tableData', () => {
    const tableData = [
      {
        type: 'conditional',
        path: ['if/then/else'],
        condition: { title: 'If', rows: [] },
        branches: [],
      },
    ];

    const { getByText } = render(
      <table>
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>,
    );

    expect(
      getByText('Mocked ConditionalRows: If (0, true)'),
    ).toBeInTheDocument();
  });

  it('increments stripe indices across logical rows', () => {
    const tableData = [
      { type: 'property', name: 'prop1', path: ['prop1'] },
      {
        type: 'choice',
        choiceType: 'anyOf',
        path: ['choice'],
        options: [],
      },
      {
        type: 'conditional',
        path: ['if/then/else'],
        condition: { title: 'If', rows: [] },
        branches: [],
      },
      { type: 'property', name: 'prop2', path: ['prop2'] },
    ];

    const { getByText } = render(
      <table>
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>,
    );

    expect(getByText('Mocked PropertyRow: prop1 (0)')).toBeInTheDocument();
    expect(
      getByText('Mocked FoldableRows: anyOf (1, true)'),
    ).toBeInTheDocument();
    expect(
      getByText('Mocked ConditionalRows: If (2, true)'),
    ).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: prop2 (3)')).toBeInTheDocument();
  });
});

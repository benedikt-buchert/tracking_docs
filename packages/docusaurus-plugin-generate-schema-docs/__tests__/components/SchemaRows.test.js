import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import SchemaRows from '../../components/SchemaRows';

// Mock child components
jest.mock('../../components/PropertyRow', () => (props) => (
  <tr>
    <td>Mocked PropertyRow: {props.row.name}</td>
  </tr>
));

jest.mock('../../components/FoldableRows', () => (props) => (
  <tr>
    <td>Mocked FoldableRows: {props.row.choiceType}</td>
  </tr>
));

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
      </table>
    );

    expect(getByText('Mocked PropertyRow: name')).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: age')).toBeInTheDocument();
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
      </table>
    );

    // It should render both the parent and child property from the flat list
    expect(getByText('Mocked PropertyRow: user')).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: id')).toBeInTheDocument();
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
      </table>
    );

    expect(getByText('Mocked FoldableRows: oneOf')).toBeInTheDocument();
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
      </table>
    );

    expect(getByText('Mocked PropertyRow: prop1')).toBeInTheDocument();
    expect(getByText('Mocked FoldableRows: anyOf')).toBeInTheDocument();
    expect(getByText('Mocked PropertyRow: prop2')).toBeInTheDocument();
  });
});

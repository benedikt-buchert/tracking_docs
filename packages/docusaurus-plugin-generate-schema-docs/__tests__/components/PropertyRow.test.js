import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import PropertyRow from '../../components/PropertyRow';

describe('PropertyRow', () => {
  it('renders a basic property', () => {
    const row = {
      name: 'name',
      level: 0,
      required: false,
      propertyType: 'string',
      description: 'The name of the user.',
      example: 'John Doe',
      constraints: [],
      path: ['name'],
    };

    const { getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>
    );

    expect(getByText('name')).toBeInTheDocument();
    expect(getByText('string')).toBeInTheDocument();
    expect(getByText('The name of the user.')).toBeInTheDocument();
    expect(getByText('John Doe')).toBeInTheDocument();
  });

  it('marks required properties', () => {
    const row = {
      name: 'name',
      level: 0,
      required: true,
      propertyType: 'string',
      description: '',
      example: '',
      constraints: ['required'],
      path: ['name'],
    };

    const { container, getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>
    );

    expect(container.querySelector('.required-row')).toBeInTheDocument();
    expect(container.querySelector('.required')).toBeInTheDocument();
    expect(getByText('required')).toBeInTheDocument();
  });

  it('renders multiple constraints', () => {
    const row = {
      name: 'name',
      level: 0,
      required: true,
      propertyType: 'string',
      description: '',
      example: '',
      constraints: ['required', 'minLength: 1', 'maxLength: 10'],
      path: ['name'],
    };

    const { getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>
    );
    expect(getByText('required')).toBeInTheDocument();
    expect(getByText('minLength: 1')).toBeInTheDocument();
    expect(getByText('maxLength: 10')).toBeInTheDocument();
  });

  it('renders an example', () => {
    const row = {
      name: 'name',
      level: 0,
      required: false,
      propertyType: 'string',
      description: '',
      example: 'foo',
      constraints: [],
      path: ['name'],
    };

    const { getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>
    );
    expect(getByText('foo')).toBeInTheDocument();
  });

  it('does not render anything for empty constraints', () => {
    const row = {
      name: 'name',
      level: 0,
      required: false,
      propertyType: 'string',
      description: '',
      example: '',
      constraints: [],
      path: ['name'],
    };

    const { container } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>
    );

    // The cell for constraints is the 3rd cell (index 2)
    const cells = container.querySelectorAll('td');
    expect(cells[2].innerHTML).toBe('');
  });
});

import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import PropertyRow from '../../components/PropertyRow';

describe('PropertyRow', () => {
    const getConstraints = (prop, isReq) => {
        const constraints = [];
        if (isReq) constraints.push('required');
        if (prop.minLength) constraints.push(`minLength: ${prop.minLength}`);
        if (prop.maxLength) constraints.push(`maxLength: ${prop.maxLength}`);
        return constraints;
    };

    it('renders a basic property', () => {
        const prop = { type: 'string', description: 'The name of the user.' };
        const { getByText } = render(
            <table>
                <tbody>
                    <PropertyRow propertyKey="name" prop={prop} requiredList={[]} getConstraints={getConstraints} />
                </tbody>
            </table>
        );
        expect(getByText('name')).toBeInTheDocument();
        expect(getByText('string')).toBeInTheDocument();
        expect(getByText('The name of the user.')).toBeInTheDocument();
    });

    it('marks required properties', () => {
        const prop = { type: 'string' };
        const { container } = render(
            <table>
                <tbody>
                    <PropertyRow propertyKey="name" prop={prop} requiredList={['name']} getConstraints={getConstraints} />
                </tbody>
            </table>
        );
        expect(container.querySelector('.required-row')).toBeInTheDocument();
        expect(container.querySelector('.required')).toBeInTheDocument();
    });

    it('renders multiple constraints', () => {
        const prop = { type: 'string', minLength: 1, maxLength: 10 };
        const { getByText } = render(
            <table>
                <tbody>
                    <PropertyRow propertyKey="name" prop={prop} requiredList={['name']} getConstraints={getConstraints} />
                </tbody>
            </table>
        );
        expect(getByText('required')).toBeInTheDocument();
        expect(getByText('minLength: 1')).toBeInTheDocument();
        expect(getByText('maxLength: 10')).toBeInTheDocument();
    });

    it('formats examples', () => {
        const prop = { type: 'string', examples: ['foo', 'bar'] };
        const { getByText } = render(
            <table>
                <tbody>
                    <PropertyRow propertyKey="name" prop={prop} requiredList={[]} getConstraints={getConstraints} />
                </tbody>
            </table>
        );
        expect(getByText('foo, bar')).toBeInTheDocument();
    });

    it('renders oneOf property with combined types', () => {
        const prop = {
            oneOf: [
                { type: 'string' },
                { type: 'integer' },
            ],
            description: 'The ID of the user.'
        };
        const { getByText } = render(
            <table>
                <tbody>
                    <PropertyRow propertyKey="user_id" prop={prop} requiredList={[]} getConstraints={getConstraints} />
                </tbody>
            </table>
        );
        expect(getByText('user_id')).toBeInTheDocument();
        expect(getByText('string | integer')).toBeInTheDocument();
        expect(getByText('The ID of the user.')).toBeInTheDocument();
    });

    it('does not render empty code tag for constraints', () => {
        const prop = { type: 'string' };
        const { container } = render(
            <table>
                <tbody>
                    <PropertyRow propertyKey="name" prop={prop} requiredList={[]} getConstraints={() => []} />
                </tbody>
            </table>
        );
        // There should be no `<code>` tag if there are no constraints.
        // The cell for constraints should be empty.
        const cells = container.querySelectorAll('td');
        expect(cells[2].innerHTML).toBe('');
    });
});

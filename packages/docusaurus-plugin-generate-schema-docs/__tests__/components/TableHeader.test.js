import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import TableHeader from '../../components/TableHeader';

describe('TableHeader', () => {
    it('renders the table header with correct columns', () => {
        const { getByText } = render(
            <table>
                <TableHeader />
            </table>
        );

        expect(getByText('Property')).toBeInTheDocument();
        expect(getByText('Type')).toBeInTheDocument();
        expect(getByText('Constraints')).toBeInTheDocument();
        expect(getByText('Examples')).toBeInTheDocument();
        expect(getByText('Description')).toBeInTheDocument();
    });
});

import React from 'react';

export default function TableHeader() {
    return (
        <thead>
            <tr>
                <th width="20%">Property</th>
                <th width="15%">Type</th>
                <th width="25%">Constraints</th>
                <th width="15%">Examples</th>
                <th>Description</th>
            </tr>
        </thead>
    );
}
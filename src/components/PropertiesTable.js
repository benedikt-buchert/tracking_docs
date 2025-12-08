import SchemaRows from './SchemaRows';

export default function PropertiesTable({ schema }) {

    return <table>
        <thead>
            <tr>
                <th width="20%">Property</th>
                <th width="15%">Type</th>
                <th width="10%">Req</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            <SchemaRows properties={schema.properties} requiredList={schema.required} />
        </tbody>
    </table>
}
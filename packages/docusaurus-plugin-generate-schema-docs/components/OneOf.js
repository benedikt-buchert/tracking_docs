import React, { useState } from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import { getConstraints } from '../helpers/getConstraints';
import PropertyRow from './PropertyRow';


const OneOf = ({ schemas, level, getConstraints, type }) => {
    const [selectedTab, setSelectedTab] = useState(Object.keys(schemas)[0]);

    const title = type === 'oneOf' ? 'Select one of the following options:' : 'Select any of the following options:';

    return (
        <React.Fragment>
            <tr >
                <td colSpan="5" className="nested-table-container">
                    <Heading as="h4">{title}</Heading>
                    <Tabs>
                        {schemas.map((schema, index) => (
                            <TabItem value={index} label={schema.title || `Option ${index + 1}`} key={index}>
                                <table style={{ width: '100%', marginTop: '5px' }}>
                                    <TableHeader />
                                    <tbody>
                                        {schema.properties ? (
                                            <SchemaRows
                                                properties={schema.properties}
                                                requiredList={schema.required || []}
                                                level={level + 1}
                                                getConstraints={getConstraints}
                                            />
                                        ) : (
                                            <PropertyRow
                                                propertyKey={schema.title || `Option ${index + 1}`}
                                                prop={schema}
                                                requiredList={[]}
                                                getConstraints={getConstraints}
                                            />
                                        )}
                                    </tbody>
                                </table>
                            </TabItem>
                        ))}
                    </Tabs>
                </td>
            </tr>
        </React.Fragment>
    );
};

export default OneOf;

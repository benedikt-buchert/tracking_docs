import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import SchemaJsonViewer from '../../components/SchemaJsonViewer';

// Mock CodeBlock as it's an external theme component
jest.mock('@theme/CodeBlock', () => {
  return function DummyCodeBlock({ children, language }) {
    return <pre data-language={language}>{children}</pre>;
  };
});

describe('SchemaJsonViewer', () => {
  it('renders the schema in a CodeBlock', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    const { getByText, container } = render(
      <SchemaJsonViewer schema={schema} />,
    );

    expect(getByText('View Raw JSON Schema')).toBeInTheDocument();
    const detailsElement = container.querySelector('details');
    expect(detailsElement).toHaveClass('schema-json-viewer');
    const codeBlockElement = container.querySelector('pre');
    expect(codeBlockElement).toBeInTheDocument();
    expect(codeBlockElement).toHaveAttribute('data-language', 'json');
    expect(codeBlockElement.textContent).toEqual(
      JSON.stringify(schema, null, 2),
    );
  });
});

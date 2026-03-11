/* eslint-disable @docusaurus/no-html-links */
import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SchemaJsonViewer from '../../components/SchemaJsonViewer';

jest.mock(
  '@docusaurus/Link',
  () => {
    return function DocusaurusLink({ children, ...props }) {
      return <a {...props}>{children}</a>;
    };
  },
  { virtual: true },
);

describe('SchemaJsonViewer', () => {
  it('renders the schema in a syntax-highlighted pre block', () => {
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
    expect(codeBlockElement.textContent.replace(/\s+/g, '')).toEqual(
      JSON.stringify(schema, null, 2).replace(/\s+/g, ''),
    );
  });

  it('navigates local $ref values inside the viewer and resets to root', () => {
    const rootSchema = {
      type: 'object',
      properties: {
        component: { $ref: './components/referenced.json' },
      },
    };
    const referencedSchema = {
      title: 'Referenced Component',
      type: 'object',
      properties: {
        prop: { type: 'string' },
      },
    };

    render(
      <SchemaJsonViewer
        schema={rootSchema}
        sourcePath="main-schema.json"
        schemaSources={{
          'main-schema.json': rootSchema,
          'components/referenced.json': referencedSchema,
        }}
      />,
    );

    fireEvent.click(screen.getByText('View Raw JSON Schema'));
    fireEvent.click(
      screen.getByRole('button', { name: '"./components/referenced.json"' }),
    );

    expect(screen.getAllByText(/Referenced Component/).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole('button', { name: 'Back to root' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to root' }));

    expect(
      screen.getByText('"./components/referenced.json"'),
    ).toBeInTheDocument();
  });

  it('renders external $ref values as new-tab links', () => {
    const schema = {
      $ref: 'https://example.com/schema.json',
    };

    render(<SchemaJsonViewer schema={schema} sourcePath="root.json" />);

    fireEvent.click(screen.getByText('View Raw JSON Schema'));
    const refLink = screen.getByRole('link', {
      name: '"https://example.com/schema.json"',
    });

    expect(refLink).toHaveAttribute('href', 'https://example.com/schema.json');
    expect(refLink).toHaveAttribute('target', '_blank');
    expect(refLink).toHaveAttribute('rel', 'noreferrer');
  });
});

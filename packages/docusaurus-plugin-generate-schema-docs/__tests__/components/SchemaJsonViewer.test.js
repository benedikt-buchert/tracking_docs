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

jest.mock('@docusaurus/theme-common', () => ({
  usePrismTheme: () => ({
    plain: {
      color: 'rgb(1, 2, 3)',
      backgroundColor: 'rgb(4, 5, 6)',
    },
    styles: [
      {
        types: ['property'],
        style: { color: 'rgb(0, 0, 255)' },
      },
      {
        types: ['string'],
        style: { color: 'rgb(255, 0, 0)' },
      },
      {
        types: ['number'],
        style: { color: 'rgb(0, 128, 0)' },
      },
    ],
  }),
}));

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

  it('uses the prism theme for base json token styling', () => {
    const schema = {
      type: 'string',
      examples: ['x'],
    };

    render(<SchemaJsonViewer schema={schema} />);

    fireEvent.click(screen.getByText('View Raw JSON Schema'));

    expect(screen.getByText('"type"')).toHaveStyle({ color: 'rgb(0, 0, 255)' });
    expect(screen.getByText('"string"')).toHaveStyle({
      color: 'rgb(255, 0, 0)',
    });
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

  it('highlights schema meta keywords inside the raw json view', () => {
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/event.json',
      $anchor: 'eventRoot',
      $comment: 'Internal authoring note',
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/validation': true,
      },
      type: 'object',
    };

    render(<SchemaJsonViewer schema={schema} sourcePath="event.json" />);

    fireEvent.click(screen.getByText('View Raw JSON Schema'));

    expect(screen.getByText('"$schema"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--meta',
    );
    expect(screen.getByText('"$anchor"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--meta',
    );
    expect(screen.getByText('"$vocabulary"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--meta',
    );
  });

  it('highlights structural schema keywords inside the raw json view', () => {
    const schema = {
      type: 'object',
      allOf: [{ $ref: './component.json' }],
      properties: {
        name: { type: 'string' },
      },
    };

    render(<SchemaJsonViewer schema={schema} sourcePath="event.json" />);

    fireEvent.click(screen.getByText('View Raw JSON Schema'));

    expect(screen.getByText('"allOf"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--structural',
    );
    expect(screen.getByText('"properties"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--structural',
    );
    expect(screen.getByText('"$ref"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--structural',
    );
  });

  it('does not highlight payload property names inside properties as meta keywords', () => {
    const schema = {
      type: 'object',
      properties: {
        $schema: {
          type: 'string',
        },
      },
    };

    render(<SchemaJsonViewer schema={schema} sourcePath="event.json" />);

    fireEvent.click(screen.getByText('View Raw JSON Schema'));

    expect(screen.getByText('"properties"')).toHaveClass(
      'schema-json-viewer__keyword',
      'schema-json-viewer__keyword--structural',
    );
    expect(screen.getByText('"$schema"')).toHaveClass('token property');
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
    expect(refLink).toHaveClass('schema-json-viewer__ref-link');
  });
});

import '@testing-library/jest-dom';
import fs from 'fs';
import React from 'react';
import path from 'path';
import { render } from '@testing-library/react';
import PropertyRow from '../../components/PropertyRow';

describe('PropertyRow', () => {
  it('does not suppress first-column separators for nested tree cells in CSS', () => {
    const cssPath = path.join(__dirname, '../../components/SchemaRows.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).not.toContain(
      '.schema-table tbody tr + tr td.property-cell--tree',
    );
  });

  it('removes the extra left border from full-width schema rows in CSS', () => {
    const cssPath = path.join(__dirname, '../../components/SchemaRows.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain(".schema-table td[colspan='5']");
    expect(css).toContain('border-left: none;');
  });

  it('defines an explicit neutral class for control rows in CSS', () => {
    const cssPath = path.join(__dirname, '../../components/SchemaRows.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('.schema-row--control');
    expect(css).toContain('background-color: transparent');
  });
  it('renders a basic property', () => {
    const row = {
      name: 'name',
      level: 0,
      required: false,
      propertyType: 'string',
      description: 'The name of the user.',
      examples: ['John Doe'],
      constraints: [],
      path: ['name'],
    };

    const { getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>,
    );

    expect(getByText('name')).toBeInTheDocument();
    expect(getByText('string')).toBeInTheDocument();
    expect(getByText('The name of the user.')).toBeInTheDocument();
    expect(getByText('"John Doe"')).toBeInTheDocument();
  });

  it('renders array type values as comma-separated text', () => {
    const row = {
      name: 'additionalProperties',
      level: 0,
      required: false,
      propertyType: ['string', 'number', 'integer', 'boolean', 'null'],
      description: 'Catch-all values.',
      examples: [],
      constraints: [],
      path: ['additionalProperties'],
    };

    const { getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>,
    );

    expect(
      getByText('string, number, integer, boolean, null'),
    ).toBeInTheDocument();
  });

  it('marks required properties', () => {
    const row = {
      name: 'name',
      level: 0,
      required: true,
      propertyType: 'string',
      description: '',
      examples: [],
      constraints: ['required'],
      path: ['name'],
    };

    const { container, getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>,
    );

    expect(container.querySelector('.required-row')).toBeInTheDocument();
    expect(
      container.querySelector('.property-cell--required'),
    ).toBeInTheDocument();
    expect(container.querySelector('.required')).toBeInTheDocument();
    expect(getByText('required')).toBeInTheDocument();
  });

  it('applies the same zebra class to the main row and continuation rows', () => {
    const row = {
      name: 'event',
      level: 0,
      required: true,
      propertyType: 'string',
      description: 'Event name.',
      examples: ['purchase'],
      constraints: ['required', 'const: "purchase"'],
      path: ['event'],
    };

    const { container } = render(
      <table>
        <tbody>
          <PropertyRow row={row} stripeIndex={1} />
        </tbody>
      </table>,
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveClass('schema-row--zebra-odd');
    expect(rows[1]).toHaveClass('schema-row--zebra-odd');
    expect(rows[0]).not.toHaveClass('schema-row--zebra-even');
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
      </table>,
    );
    expect(getByText('required')).toBeInTheDocument();
    expect(getByText('minLength: 1')).toBeInTheDocument();
    expect(getByText('maxLength: 10')).toBeInTheDocument();
  });

  it('marks only the property column cell with property-cell class', () => {
    const row = {
      name: 'name',
      level: 0,
      required: true,
      propertyType: 'string',
      description: '',
      example: '',
      constraints: ['required', 'minLength: 1'],
      path: ['name'],
    };

    const { container } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>,
    );

    const propertyCell = container.querySelector('td.property-cell');
    expect(propertyCell).toBeInTheDocument();

    const subsequentConstraintRows = container.querySelectorAll('tbody tr');
    expect(subsequentConstraintRows.length).toBeGreaterThan(1);
    expect(
      subsequentConstraintRows[1].querySelector('td.property-cell'),
    ).not.toBeInTheDocument();
  });

  it('renders an example', () => {
    const row = {
      name: 'name',
      level: 0,
      required: false,
      propertyType: 'string',
      description: '',
      examples: ['foo'],
      constraints: [],
      path: ['name'],
    };

    const { getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} />
        </tbody>
      </table>,
    );
    expect(getByText('"foo"')).toBeInTheDocument();
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
      </table>,
    );

    // The cell for constraints is the 3rd cell (index 2)
    const cells = container.querySelectorAll('td');
    expect(cells[2].innerHTML).toBe('');
  });

  it('renders additionalProperties as a schema keyword row and keeps its connector open', () => {
    const row = {
      name: 'additionalProperties',
      level: 1,
      required: false,
      propertyType: 'string',
      description: 'Catch-all values.',
      examples: ['beta_tester'],
      constraints: [],
      path: ['user_properties', 'additionalProperties'],
      hasChildren: false,
      containerType: null,
      continuingLevels: [],
      isSchemaKeywordRow: true,
      keepConnectorOpen: false,
    };

    const { container, getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} isLastInGroup={true} />
        </tbody>
      </table>,
    );

    const keyword = getByText('additionalProperties');
    expect(keyword).toBeInTheDocument();
    expect(container.querySelector('.property-keyword')).toBeInTheDocument();
    expect(
      container.querySelector('.property-cell--keyword'),
    ).toBeInTheDocument();
    expect(container.querySelector('.property-cell--tree')).toBeInTheDocument();
    expect(
      container.querySelector('.property-name--keyword'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('.property-keyword-badge'),
    ).toBeInTheDocument();
    expect(getByText('Schema constraint')).toBeInTheDocument();
    expect(keyword).not.toHaveAttribute('title');
    expect(keyword).toHaveAttribute(
      'aria-describedby',
      'schema-keyword-help-user_properties-additionalProperties',
    );
    expect(
      container.querySelector('.property-keyword-tooltip'),
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        '#schema-keyword-help-user_properties-additionalProperties',
      ),
    ).toBeInTheDocument();
    expect(
      getByText(
        'Controls properties not listed in properties and not matched by patternProperties.',
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('.is-last')).toBeInTheDocument();
  });

  it('defines keyword badge styles in CSS', () => {
    const cssPath = path.join(__dirname, '../../components/SchemaRows.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('.property-keyword-badge');
    expect(css).toContain('text-transform: uppercase');
  });

  it('renders patternProperties rows as schema keywords with tooltip help', () => {
    const row = {
      name: 'patternProperties /^custom_/',
      level: 1,
      required: false,
      propertyType: 'number',
      description: 'Numeric custom attribute values.',
      examples: [5],
      constraints: ['minimum: 0'],
      path: ['attributes', 'patternProperties /^custom_/'],
      hasChildren: false,
      containerType: null,
      continuingLevels: [],
      isSchemaKeywordRow: true,
      keepConnectorOpen: false,
    };

    const { container, getByText } = render(
      <table>
        <tbody>
          <PropertyRow row={row} isLastInGroup={true} />
        </tbody>
      </table>,
    );

    const keyword = getByText('patternProperties');
    expect(getByText('/^custom_/')).toBeInTheDocument();
    expect(
      container.querySelector('.property-keyword-pattern'),
    ).toBeInTheDocument();
    expect(keyword).toHaveAttribute(
      'aria-describedby',
      'schema-keyword-help-attributes-patternProperties___custom__',
    );
    expect(
      container.ownerDocument.getElementById(
        'schema-keyword-help-attributes-patternProperties___custom__',
      ),
    ).toBeInTheDocument();
    expect(
      getByText(
        'Applies the subschema to property names that match the given regular expression.',
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('.is-last')).toBeInTheDocument();
  });

  it('uses unique tooltip ids for repeated schema keyword rows', () => {
    const firstRow = {
      name: 'additionalProperties',
      level: 1,
      required: false,
      propertyType: 'string',
      description: 'User property values.',
      examples: ['beta_tester'],
      constraints: [],
      path: ['user_properties', 'additionalProperties'],
      hasChildren: false,
      containerType: null,
      continuingLevels: [],
      isSchemaKeywordRow: true,
      keepConnectorOpen: false,
    };
    const secondRow = {
      ...firstRow,
      path: ['metadata', 'additionalProperties'],
      description: 'Metadata values.',
    };

    const { container, getAllByText } = render(
      <table>
        <tbody>
          <PropertyRow row={firstRow} isLastInGroup={true} />
          <PropertyRow row={secondRow} isLastInGroup={true} />
        </tbody>
      </table>,
    );

    const keywords = getAllByText('additionalProperties');
    const firstTooltipId = keywords[0].getAttribute('aria-describedby');
    const secondTooltipId = keywords[1].getAttribute('aria-describedby');

    expect(firstTooltipId).toBeTruthy();
    expect(secondTooltipId).toBeTruthy();
    expect(firstTooltipId).not.toBe(secondTooltipId);
    expect(container.querySelector(`#${firstTooltipId}`)).toBeInTheDocument();
    expect(container.querySelector(`#${secondTooltipId}`)).toBeInTheDocument();
  });

  describe('hierarchical lines feature', () => {
    it('renders {} symbol for object containers', () => {
      const row = {
        name: 'user_data',
        level: 0,
        required: false,
        propertyType: 'object',
        description: '',
        example: '',
        constraints: [],
        path: ['user_data'],
        hasChildren: true,
        containerType: 'object',
        continuingLevels: [],
      };

      const { container, getByText } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(getByText('{}')).toBeInTheDocument();
      expect(container.querySelector('.container-symbol')).toBeInTheDocument();
    });

    it('renders [] symbol for array containers', () => {
      const row = {
        name: 'addresses',
        level: 0,
        required: false,
        propertyType: 'array',
        description: '',
        example: '',
        constraints: [],
        path: ['addresses'],
        hasChildren: true,
        containerType: 'array',
        continuingLevels: [],
      };

      const { container, getByText } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(getByText('[]')).toBeInTheDocument();
      expect(container.querySelector('.container-symbol')).toBeInTheDocument();
    });

    it('does not render container symbol for simple properties', () => {
      const row = {
        name: 'name',
        level: 0,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['name'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(
        container.querySelector('.container-symbol'),
      ).not.toBeInTheDocument();
    });

    it('applies has-children class when property has children', () => {
      const row = {
        name: 'user_data',
        level: 1,
        required: false,
        propertyType: 'object',
        description: '',
        example: '',
        constraints: [],
        path: ['user_data'],
        hasChildren: true,
        containerType: 'object',
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(container.querySelector('.has-children')).toBeInTheDocument();
    });

    it('applies container-object class for object containers', () => {
      const row = {
        name: 'user_data',
        level: 1,
        required: false,
        propertyType: 'object',
        description: '',
        example: '',
        constraints: [],
        path: ['user_data'],
        hasChildren: true,
        containerType: 'object',
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(container.querySelector('.container-object')).toBeInTheDocument();
    });

    it('applies container-array class for array containers', () => {
      const row = {
        name: 'addresses',
        level: 1,
        required: false,
        propertyType: 'array',
        description: '',
        example: '',
        constraints: [],
        path: ['addresses'],
        hasChildren: true,
        containerType: 'array',
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(container.querySelector('.container-array')).toBeInTheDocument();
    });

    it('applies is-last class when isLastInGroup is true', () => {
      const row = {
        name: 'last_item',
        level: 1,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['last_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
        isLastInGroup: true,
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} isLastInGroup={true} />
          </tbody>
        </table>,
      );

      expect(container.querySelector('.is-last')).toBeInTheDocument();
    });

    it('applies level class based on nesting level', () => {
      const row = {
        name: 'nested_item',
        level: 2,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['parent', 'nested_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(container.querySelector('.level-2')).toBeInTheDocument();
      expect(
        container.querySelector('.property-cell--tree'),
      ).toBeInTheDocument();
    });

    it('does not add a separator-suppression class to nested tree cells', () => {
      const row = {
        name: 'nested_item',
        level: 2,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['parent', 'nested_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(
        container.querySelector('.property-cell--tree-no-separator'),
      ).not.toBeInTheDocument();
    });

    it('does not mark root-level cells as tree cells', () => {
      const row = {
        name: 'root_item',
        level: 0,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['root_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      expect(
        container.querySelector('.property-cell--tree'),
      ).not.toBeInTheDocument();
    });

    it('applies padding-left based on level using rem units', () => {
      const row = {
        name: 'nested_item',
        level: 2,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['parent', 'nested_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      const td = container.querySelector('td');
      // level 2: 2 * 1.25 + 0.5 = 3rem
      expect(td.style.paddingLeft).toBe('3rem');
    });

    it('applies background-image for parent-to-child line when hasChildren is true', () => {
      const row = {
        name: 'user_data',
        level: 1,
        required: false,
        propertyType: 'object',
        description: '',
        example: '',
        constraints: [],
        path: ['user_data'],
        hasChildren: true,
        containerType: 'object',
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      const td = container.querySelector('td');
      expect(td.style.backgroundImage).toContain('linear-gradient');
    });

    it('applies background-image for continuing ancestor lines', () => {
      const row = {
        name: 'deep_item',
        level: 3,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['a', 'b', 'deep_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [0, 1], // Ancestors at levels 0 and 1 have more siblings
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      const td = container.querySelector('td');
      // Should have background gradients for continuing lines
      // Level 0 passes filter (0 < 3-1 = 2), level 1 passes (1 < 2)
      expect(td.style.backgroundImage).toContain('linear-gradient');
    });

    it('filters out immediate parent level from continuing lines', () => {
      const row = {
        name: 'nested_item',
        level: 2,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['parent', 'nested_item'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [0, 1], // Level 1 is immediate parent
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      const td = container.querySelector('td');
      // Filter is lvl < level - 1, so for level 2: lvl < 1
      // Only level 0 should pass, level 1 should be filtered out
      // So we should have exactly one gradient (for level 0)
      const bgImage = td.style.backgroundImage;
      // Count occurrences of linear-gradient
      const gradientCount = (bgImage.match(/linear-gradient/g) || []).length;
      expect(gradientCount).toBe(1);
    });

    it('has no background-image when continuingLevels is empty and no children', () => {
      const row = {
        name: 'simple',
        level: 1,
        required: false,
        propertyType: 'string',
        description: '',
        example: '',
        constraints: [],
        path: ['simple'],
        hasChildren: false,
        containerType: null,
        continuingLevels: [],
      };

      const { container } = render(
        <table>
          <tbody>
            <PropertyRow row={row} />
          </tbody>
        </table>,
      );

      const td = container.querySelector('td');
      expect(td.style.backgroundImage).toBe('');
    });
  });
});

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
      </table>,
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

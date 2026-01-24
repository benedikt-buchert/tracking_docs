import { schemaToTableData } from '../../helpers/schemaToTableData';

describe('schemaToTableData - hierarchical lines', () => {
  describe('hasChildren property', () => {
    it('sets hasChildren to true for objects with nested properties', () => {
      const schema = {
        properties: {
          user_data: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const userDataRow = tableData.find((row) => row.name === 'user_data');

      expect(userDataRow.hasChildren).toBe(true);
    });

    it('sets hasChildren to true for arrays with item properties', () => {
      const schema = {
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const itemsRow = tableData.find((row) => row.name === 'items');

      expect(itemsRow.hasChildren).toBe(true);
    });

    it('sets hasChildren to false for simple properties', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const tableData = schemaToTableData(schema);

      tableData.forEach((row) => {
        expect(row.hasChildren).toBe(false);
      });
    });

    it('sets hasChildren to true for properties with nested oneOf/anyOf', () => {
      const schema = {
        properties: {
          payment_method: {
            type: 'object',
            anyOf: [
              {
                title: 'Credit Card',
                properties: { card_number: { type: 'string' } },
              },
            ],
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const paymentRow = tableData.find(
        (row) => row.name === 'payment_method' && row.type === 'property',
      );

      expect(paymentRow.hasChildren).toBe(true);
    });
  });

  describe('containerType property', () => {
    it('sets containerType to "object" for object properties with nested properties', () => {
      const schema = {
        properties: {
          user_data: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const userDataRow = tableData.find((row) => row.name === 'user_data');

      expect(userDataRow.containerType).toBe('object');
    });

    it('sets containerType to "array" for arrays with item properties', () => {
      const schema = {
        properties: {
          addresses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const addressesRow = tableData.find((row) => row.name === 'addresses');

      expect(addressesRow.containerType).toBe('array');
    });

    it('sets containerType to null for simple properties', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);
      const nameRow = tableData.find((row) => row.name === 'name');

      expect(nameRow.containerType).toBeNull();
    });
  });

  describe('continuingLevels property', () => {
    it('includes parent level in continuingLevels when parent has more siblings', () => {
      const schema = {
        properties: {
          user_data: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          },
          other_field: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);

      // name is not last (age comes after), so it should include level 0 in continuingLevels
      // because user_data (at level 0) has siblings (other_field)
      const nameRow = tableData.find(
        (row) => row.name === 'name' && row.level === 1,
      );

      expect(nameRow.continuingLevels).toContain(0);
    });

    it('does not include parent level when parent is last sibling', () => {
      const schema = {
        properties: {
          user_data: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const nameRow = tableData.find(
        (row) => row.name === 'name' && row.level === 1,
      );

      // user_data is the only/last property at level 0, so no continuing level
      expect(nameRow.continuingLevels).not.toContain(0);
    });

    it('removes immediate parent level from continuingLevels when item is last', () => {
      const schema = {
        properties: {
          user_data: {
            type: 'object',
            properties: {
              attributes: {
                type: 'object',
                properties: {
                  segment: { type: 'string' },
                },
              },
              addresses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    street: { type: 'string' },
                    city: { type: 'string' },
                  },
                },
              },
            },
          },
          other_field: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);

      // addresses is last at level 1, so its children should NOT have level 0 in continuingLevels
      // because the level 0 line stops at addresses
      const streetRow = tableData.find(
        (row) => row.name === 'street' && row.level === 2,
      );
      const cityRow = tableData.find(
        (row) => row.name === 'city' && row.level === 2,
      );

      expect(streetRow.continuingLevels).not.toContain(0);
      expect(cityRow.continuingLevels).not.toContain(0);
    });

    it('maintains continuingLevels through multiple nesting levels', () => {
      const schema = {
        properties: {
          level0_first: {
            type: 'object',
            properties: {
              level1_first: {
                type: 'object',
                properties: {
                  level2_item: { type: 'string' },
                },
              },
              level1_second: { type: 'string' },
            },
          },
          level0_second: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);

      // level2_item is inside level1_first (which is NOT last at level 1)
      // and level0_first is NOT last at level 0
      // so level2_item should have both levels 0 and 1... wait no
      // level2_item's immediate parent is level1_first
      // level1_first is NOT last (level1_second comes after)
      // so level2_item should have level 1 in continuingLevels? No...
      // The filter is lvl < level - 1, so for level 2, only lvl < 1 passes
      // So only level 0 would be in the continuing gradient

      const level2Row = tableData.find(
        (row) => row.name === 'level2_item' && row.level === 2,
      );

      // level0_first is not last, so level 0 should be in continuingLevels
      expect(level2Row.continuingLevels).toContain(0);
    });

    it('has empty continuingLevels for root level properties', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const tableData = schemaToTableData(schema);

      tableData.forEach((row) => {
        expect(row.continuingLevels).toEqual([]);
      });
    });
  });

  describe('isLastInGroup property', () => {
    it('sets isLastInGroup based on sibling position only', () => {
      const schema = {
        properties: {
          first: { type: 'string' },
          middle: { type: 'string' },
          last: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);

      const firstRow = tableData.find((row) => row.name === 'first');
      const middleRow = tableData.find((row) => row.name === 'middle');
      const lastRow = tableData.find((row) => row.name === 'last');

      expect(firstRow.isLastInGroup).toBe(false);
      expect(middleRow.isLastInGroup).toBe(false);
      expect(lastRow.isLastInGroup).toBe(true);
    });

    it('sets isLastInGroup to true for parent with children when it is last sibling', () => {
      const schema = {
        properties: {
          first: { type: 'string' },
          user_data: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const userDataRow = tableData.find((row) => row.name === 'user_data');

      // user_data is last AND has children, but isLastInGroup should be true
      // because it's the last sibling at its level
      expect(userDataRow.isLastInGroup).toBe(true);
      expect(userDataRow.hasChildren).toBe(true);
    });

    it('sets isLastInGroup correctly for array item children', () => {
      const schema = {
        properties: {
          addresses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                zip: { type: 'string' },
              },
            },
          },
        },
      };

      const tableData = schemaToTableData(schema);

      const streetRow = tableData.find((row) => row.name === 'street');
      const cityRow = tableData.find((row) => row.name === 'city');
      const zipRow = tableData.find((row) => row.name === 'zip');

      expect(streetRow.isLastInGroup).toBe(false);
      expect(cityRow.isLastInGroup).toBe(false);
      expect(zipRow.isLastInGroup).toBe(true);
    });
  });

  describe('choice rows', () => {
    it('includes continuingLevels in choice rows', () => {
      const schema = {
        properties: {
          user_id: {
            description: 'User ID',
            oneOf: [
              { title: 'String', type: 'string' },
              { title: 'Integer', type: 'integer' },
            ],
          },
          other_field: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);
      const choiceRow = tableData.find((row) => row.type === 'choice');

      expect(choiceRow).toBeDefined();
      expect(choiceRow.continuingLevels).toBeDefined();
      expect(Array.isArray(choiceRow.continuingLevels)).toBe(true);
    });

    it('passes continuingLevels to choice option rows', () => {
      const schema = {
        properties: {
          payment_method: {
            type: 'object',
            anyOf: [
              {
                title: 'Credit Card',
                properties: {
                  card_number: { type: 'string' },
                },
              },
            ],
          },
          other_field: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);
      const choiceRow = tableData.find(
        (row) => row.type === 'choice' && row.level === 1,
      );

      expect(choiceRow).toBeDefined();
      expect(choiceRow.options).toBeDefined();
      expect(choiceRow.options[0].rows).toBeDefined();

      // The option rows should have their own continuingLevels
      const optionRow = choiceRow.options[0].rows[0];
      expect(optionRow.continuingLevels).toBeDefined();
    });

    // NEW TEST CASE START
    it('sets isLastInGroup correctly based on option position (visual tree line fix)', () => {
      const schema = {
        properties: {
          payment_method: {
            type: 'object',
            anyOf: [
              {
                title: 'Credit Card', // Not the last option
                type: 'object',
                properties: {
                  expiry_date: { type: 'string' }, // Should NOT be last in group visually
                },
              },
              {
                title: 'PayPal', // The last option
                type: 'object',
                properties: {
                  email: { type: 'string' }, // Should be last in group visually
                },
              },
            ],
          },
        },
      };

      const tableData = schemaToTableData(schema);
      const choiceRow = tableData.find((row) => row.type === 'choice');

      const creditCardOption = choiceRow.options[0];
      const payPalOption = choiceRow.options[1];

      const expiryRow = creditCardOption.rows.find(
        (r) => r.name === 'expiry_date',
      );
      const emailRow = payPalOption.rows.find((r) => r.name === 'email');

      // Credit Card is not the last option, so its properties shouldn't close the visual branch
      expect(expiryRow.isLastInGroup).toBe(false);

      // PayPal is the last option, so its property should close the branch
      expect(emailRow.isLastInGroup).toBe(true);
    });
    // NEW TEST CASE END
  });

  describe('complex nested schema', () => {
    it('correctly calculates all hierarchical properties for deeply nested schema', () => {
      const schema = {
        properties: {
          user_data: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              attributes: {
                type: 'object',
                properties: {
                  segment: { type: 'string' },
                  score: { type: 'number' },
                },
              },
              addresses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    street: { type: 'string' },
                    city: { type: 'string' },
                  },
                },
              },
            },
          },
          string_field: { type: 'string' },
        },
      };

      const tableData = schemaToTableData(schema);

      // user_data: level 0, has children, object container, not last
      const userDataRow = tableData.find(
        (row) => row.name === 'user_data' && row.level === 0,
      );
      expect(userDataRow.hasChildren).toBe(true);
      expect(userDataRow.containerType).toBe('object');
      expect(userDataRow.isLastInGroup).toBe(false);
      expect(userDataRow.continuingLevels).toEqual([]);

      // attributes: level 1, has children, object container, not last (addresses comes after)
      const attributesRow = tableData.find(
        (row) => row.name === 'attributes' && row.level === 1,
      );
      expect(attributesRow.hasChildren).toBe(true);
      expect(attributesRow.containerType).toBe('object');
      expect(attributesRow.isLastInGroup).toBe(false);
      expect(attributesRow.continuingLevels).toContain(0);

      // segment: level 2, no children, not last
      const segmentRow = tableData.find(
        (row) => row.name === 'segment' && row.level === 2,
      );
      expect(segmentRow.hasChildren).toBe(false);
      expect(segmentRow.containerType).toBeNull();
      expect(segmentRow.isLastInGroup).toBe(false);
      // Should have level 0 (user_data not last) but not level 1 (handled by ::before)
      expect(segmentRow.continuingLevels).toContain(0);

      // addresses: level 1, has children, array container, IS last
      const addressesRow = tableData.find(
        (row) => row.name === 'addresses' && row.level === 1,
      );
      expect(addressesRow.hasChildren).toBe(true);
      expect(addressesRow.containerType).toBe('array');
      expect(addressesRow.isLastInGroup).toBe(true);

      // street: level 2, inside addresses (which is last at level 1)
      // should NOT have level 0 in continuingLevels because addresses is last
      const streetRow = tableData.find(
        (row) => row.name === 'street' && row.level === 2,
      );
      expect(streetRow.continuingLevels).not.toContain(0);

      // string_field: level 0, no children, IS last
      const stringFieldRow = tableData.find(
        (row) => row.name === 'string_field' && row.level === 0,
      );
      expect(stringFieldRow.hasChildren).toBe(false);
      expect(stringFieldRow.containerType).toBeNull();
      expect(stringFieldRow.isLastInGroup).toBe(true);
    });
  });
});

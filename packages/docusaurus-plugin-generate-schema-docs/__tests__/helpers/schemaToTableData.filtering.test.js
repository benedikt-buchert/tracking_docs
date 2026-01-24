import { schemaToTableData } from '../../helpers/schemaToTableData';

describe('schemaToTableData filtering', () => {
  it('filters out a property with x-gtm-clear that is effectively empty', () => {
    const schema = {
      properties: {
        empty_object: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {},
        },
        should_appear: {
          type: 'string',
        },
      },
    };

    const tableData = schemaToTableData(schema);

    expect(tableData).toHaveLength(1);
    expect(tableData[0].name).toBe('should_appear');
  });

  it('does NOT filter a property with x-gtm-clear if it contains data', () => {
    const schema = {
      properties: {
        non_empty_object: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {
            child_prop: {
              type: 'string', // This is "data"
            },
          },
        },
      },
    };

    const tableData = schemaToTableData(schema);

    // Both the parent and child should appear
    expect(tableData).toHaveLength(2);
    expect(tableData[0].name).toBe('non_empty_object');
    expect(tableData[1].name).toBe('child_prop');
  });

  it('does NOT filter a property if x-gtm-clear is not exactly true', () => {
    const schema = {
      properties: {
        empty_object_false: {
          'x-gtm-clear': false,
          type: 'object',
          properties: {},
        },
        empty_object_missing: {
          type: 'object',
          properties: {},
        },
      },
    };

    const tableData = schemaToTableData(schema);
    expect(tableData).toHaveLength(2);
  });
});

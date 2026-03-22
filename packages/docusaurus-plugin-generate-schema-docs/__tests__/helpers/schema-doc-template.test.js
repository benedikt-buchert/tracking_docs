import MdxTemplate from '../../helpers/schema-doc-template';

describe('MdxTemplate', () => {
  const baseData = {
    schema: {
      title: 'Test Event',
      description: 'A test event schema.',
    },
    mergedSchema: { title: 'Test Event', properties: {} },
    editUrl: 'https://github.com/org/repo/edit/main/schema.json',
    file: 'schema.json',
    topPartialImport: '',
    bottomPartialImport: '',
    topPartialComponent: '',
    bottomPartialComponent: '',
    dataLayerName: null,
    sourcePath: 'schemas/test.json',
    schemaSources: null,
  };

  it('renders template without dataLayerName attribute when dataLayerName is falsy', () => {
    const result = MdxTemplate(baseData);
    expect(result).toContain('# Test Event');
    expect(result).not.toContain("dataLayerName={'");
  });

  it('renders template with dataLayerName attribute when dataLayerName is provided', () => {
    const result = MdxTemplate({ ...baseData, dataLayerName: 'dataLayer' });
    expect(result).toContain("dataLayerName={'dataLayer'}");
  });

  it('uses schema as sourceSchema when schemaSources does not contain sourcePath', () => {
    const result = MdxTemplate({
      ...baseData,
      schemaSources: { 'other/path.json': { title: 'Other' } },
    });
    // sourceSchema falls back to schema since sourcePath is not in schemaSources
    expect(result).toContain(JSON.stringify(baseData.schema));
  });

  it('uses schemaSources entry as sourceSchema when sourcePath matches', () => {
    const sourceSchema = { title: 'Source Schema', custom: true };
    const result = MdxTemplate({
      ...baseData,
      schemaSources: { 'schemas/test.json': sourceSchema },
    });
    expect(result).toContain(JSON.stringify(sourceSchema));
  });

  it('uses schema as sourceSchema when schemaSources is null/undefined', () => {
    const result = MdxTemplate({ ...baseData, schemaSources: null });
    expect(result).toContain(JSON.stringify(baseData.schema));
  });
});

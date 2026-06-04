/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

import fs from 'fs';
import path from 'path';

import processSchema from '../helpers/processSchema';
import { schemaToExamples } from '../helpers/schemaToExamples';
import { generateSnippetForTarget } from '../helpers/snippetTargets';

const schemasRoot = path.resolve(__dirname, '../../../demo/static/schemas');
const schemasDir = path.join(schemasRoot, 'next');

function readSchema(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(schemasDir, relativePath)));
}

describe('demo Braze schemas', () => {
  it('documents the agreed Braze web reference schemas', () => {
    const reference = readSchema('braze-reference.json');
    const refs = reference.oneOf.map((schemaRef) => schemaRef.$ref);

    expect(reference.title).toBe('Braze Reference');
    expect(reference['x-tracking-targets']).toEqual(['web-braze-js']);
    expect(refs).toEqual([
      './braze/order-placed-event.json',
      './braze/cart-updated-event.json',
      './braze/user-signup-event.json',
      './braze/newsletter-subscribed-event.json',
      './braze/identify-user.json',
      './braze/add-user-alias.json',
    ]);
  });

  it('uses Braze event names and identity method boundaries', () => {
    const eventSchemas = [
      ['order-placed-event.json', 'ecommerce.order_placed'],
      ['cart-updated-event.json', 'ecommerce.cart_updated'],
      ['user-signup-event.json', 'user_signup'],
      ['newsletter-subscribed-event.json', 'newsletter_subscribed'],
    ];

    eventSchemas.forEach(([fileName, eventName]) => {
      const schema = readSchema(path.join('braze', fileName));
      expect(schema['x-tracking-targets']).toEqual(['web-braze-js']);
      expect(schema['x-method']).toBe('track');
      expect(schema.properties.event.const).toBe(eventName);
      expect(schema.required).toEqual(
        expect.arrayContaining(['$schema', 'event']),
      );
    });

    const identifySchema = readSchema('braze/identify-user.json');
    expect(identifySchema['x-tracking-targets']).toEqual(['web-braze-js']);
    expect(identifySchema['x-method']).toBe('identify');
    expect(identifySchema.required).toEqual(
      expect.arrayContaining(['$schema', 'userId']),
    );
    expect(identifySchema.properties).toHaveProperty('loyalty_tier');
    expect(identifySchema.properties).toHaveProperty('preferred_store');
    expect(identifySchema.properties).toHaveProperty('marketing_opt_in');

    const aliasSchema = readSchema('braze/add-user-alias.json');
    expect(aliasSchema['x-tracking-targets']).toEqual(['web-braze-js']);
    expect(aliasSchema['x-method']).toBe('alias');
    expect(aliasSchema.required).toEqual(
      expect.arrayContaining(['$schema', 'alias_name', 'alias_label']),
    );
  });

  it('renders examples for every Braze demo schema', async () => {
    const reference = readSchema('braze-reference.json');
    const trackSnippets = [];
    const identifySnippets = [];
    const aliasSnippets = [];

    for (const schemaRef of reference.oneOf) {
      const schemaPath = path.join(
        schemasDir,
        schemaRef.$ref.replace(/^\.\//, ''),
      );
      const schema = await processSchema(schemaPath);
      const exampleGroups = schemaToExamples(schema);
      const example = exampleGroups[0]?.options[0]?.example;

      expect(example).toBeDefined();

      const snippet = generateSnippetForTarget({
        targetId: 'web-braze-js',
        example,
        schema,
      });

      if (schema['x-method'] === 'identify') {
        identifySnippets.push(snippet);
      } else if (schema['x-method'] === 'alias') {
        aliasSnippets.push(snippet);
      } else {
        trackSnippets.push({
          eventName: schema.properties.event.const,
          snippet,
        });
      }
    }

    expect(identifySnippets).toHaveLength(1);
    expect(identifySnippets[0]).toContain('braze.changeUser(');
    expect(identifySnippets[0]).toContain('user.setCustomUserAttribute(');

    expect(aliasSnippets).toHaveLength(1);
    expect(aliasSnippets[0]).toContain('braze.getUser().addAlias(');

    expect(trackSnippets).toHaveLength(4);
    trackSnippets.forEach(({ eventName, snippet }) => {
      expect(snippet).toContain(`braze.logCustomEvent("${eventName}"`);
    });
  });

  it('keeps the Braze reference in the 1.3.0 schema snapshot', () => {
    const nextReference = readSchema('braze-reference.json');
    const versionedReference = JSON.parse(
      fs.readFileSync(path.join(schemasRoot, '1.3.0', 'braze-reference.json')),
    );

    expect(versionedReference).toMatchObject({
      title: nextReference.title,
      'x-tracking-targets': nextReference['x-tracking-targets'],
      oneOf: nextReference.oneOf,
    });

    nextReference.oneOf.forEach((schemaRef) => {
      const relativePath = schemaRef.$ref.replace(/^\.\//, '');
      expect(fs.existsSync(path.join(schemasRoot, '1.3.0', relativePath))).toBe(
        true,
      );
    });
  });
});

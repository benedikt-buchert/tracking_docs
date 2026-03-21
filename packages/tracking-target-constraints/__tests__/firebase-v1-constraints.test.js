/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020.js').default;

const workspaceRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(workspaceRoot, 'manifest.json');
const firebaseConstraintPath = path.join(
  workspaceRoot,
  'schemas',
  'firebase',
  'v1',
  'flat-event-params.json',
);

function compileWithConstraint(eventSchema, constraintSchema) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const mergedSchema = {
    allOf: [eventSchema, constraintSchema],
  };
  return ajv.compile(mergedSchema);
}

describe('tracking-target-constraints firebase v1', () => {
  it('exposes firebase targets in the manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const targets = manifest.targets;

    expect(targets['android-firebase-kotlin-sdk']).toBeDefined();
    expect(targets['android-firebase-java-sdk']).toBeDefined();
    expect(targets['ios-firebase-swift-sdk']).toBeDefined();
    expect(targets['ios-firebase-objc-sdk']).toBeDefined();
    expect(targets['android-firebase-kotlin-sdk'].constraintSchema).toBe(
      './schemas/firebase/v1/flat-event-params.json',
    );
  });

  it('rejects nested object event params for firebase constraints', () => {
    const constraintSchema = JSON.parse(
      fs.readFileSync(firebaseConstraintPath, 'utf-8'),
    );
    const validate = compileWithConstraint(
      {
        type: 'object',
        properties: {
          event: { type: 'string', const: 'signup' },
          nested_payload: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
            required: ['foo'],
          },
        },
        required: ['event', 'nested_payload'],
      },
      constraintSchema,
    );

    const valid = validate({
      event: 'signup',
      nested_payload: { foo: 'bar' },
    });

    expect(valid).toBe(false);
  });

  it('allows flat scalar params and items array for firebase constraints', () => {
    const constraintSchema = JSON.parse(
      fs.readFileSync(firebaseConstraintPath, 'utf-8'),
    );
    const validate = compileWithConstraint(
      {
        type: 'object',
        properties: {
          event: { type: 'string', const: 'add_to_cart' },
          value: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_id: { type: 'string' },
                price: { type: 'number' },
              },
              required: ['item_id'],
            },
          },
        },
        required: ['event', 'items'],
      },
      constraintSchema,
    );

    const valid = validate({
      event: 'add_to_cart',
      value: 42.5,
      items: [{ item_id: 'sku-1', price: 10.5 }, { item_id: 'sku-2' }],
    });

    expect(valid).toBe(true);
  });
});

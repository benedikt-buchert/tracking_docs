import '@testing-library/jest-dom';
import path from 'path';
import { transformFileSync } from '@babel/core';
import React from 'react';
import { render } from '@testing-library/react';
import PropertyRow from '../../components/PropertyRow';
import { schemaToTableData } from '../../helpers/schemaToTableData';

// Exercise the real browser preset: Jest normally targets the current Node
// version, which leaves iterable spreads intact and misses this regression.
const filename = require.resolve('../../components/PropertyRow');
const { code } = transformFileSync(filename, {
  babelrc: false,
  configFile: false,
  presets: [require.resolve('@docusaurus/babel/preset')],
  caller: { name: 'client' },
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
const compiledModule = { exports: {} };
// Load Babel's equivalent CommonJS helpers inside Jest's CommonJS runtime.
const compiledRequire = (specifier) =>
  require(
    specifier.startsWith('.')
      ? path.resolve(path.dirname(filename), specifier)
      : specifier.replace('/helpers/esm/', '/helpers/'),
  );
// The input is our own component compiled by the installed Docusaurus preset.
new Function('require', 'module', 'exports', code)(
  compiledRequire,
  compiledModule,
  compiledModule.exports,
);

const schema = {
  type: 'object',
  properties: {
    ecommerce: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { topping: { type: 'string' } },
          },
        },
        currency: { type: 'string' },
      },
    },
  },
};

it.each([
  ['Jest/Node', PropertyRow],
  ['Docusaurus browser', compiledModule.exports.default],
])(
  '%s keeps the outer connector through array items before currency',
  (_, Row) => {
    const { getByText } = render(
      <table>
        <tbody>
          {schemaToTableData(schema).map((row) => (
            <Row key={row.path.join('.')} row={row} />
          ))}
        </tbody>
      </table>,
    );

    const cell = getByText('topping').closest('td');
    expect(getComputedStyle(cell).backgroundPosition).toBe('0.5rem top');
  },
);

import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react';
import PropertiesTable from '../../components/PropertiesTable';

const productCatalogSchema = {
  type: 'object',
  properties: Object.fromEntries(
    [
      ['id', 'string'],
      ['product_key', 'string'],
      ['locale', 'string'],
      ['placement', 'string'],
      ['priority', 'number'],
      ['is_active', 'boolean'],
      ['name', 'string'],
      ['short_description', 'string'],
      ['image_url', 'string'],
      ['price_display', 'string'],
      ['price_value', 'number'],
      ['original_price_display', 'string'],
      ['original_price_value', 'number'],
      ['currency', 'string'],
      ['discount_label', 'string'],
      ['cta_text', 'string'],
      ['cta_url', 'string'],
      ['category', 'string'],
      ['brand', 'string'],
      ['recommendation_type', 'string'],
      ['stock_status', 'string'],
      ['start_date', 'string'],
      ['end_date', 'string'],
      ['background_color', 'string'],
      ['text_color', 'string'],
      ['tags', 'array'],
      ['metadata', 'object'],
    ].map(([name, type]) => [name, { type }]),
  ),
};

describe('PropertiesTable layout', () => {
  let style;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `
      table {
        display: block;
        overflow: auto;
      }

      ${fs.readFileSync(
        path.join(__dirname, '../../components/PropertiesTable.module.css'),
        'utf8',
      )}

      ${fs.readFileSync(
        path.join(__dirname, '../../components/SchemaRows.css'),
        'utf8',
      )}
    `;
    document.head.append(style);
  });

  afterEach(() => {
    style.remove();
  });

  it('keeps a sparse product catalog grid aligned with its border', () => {
    const { getByRole } = render(
      <PropertiesTable schema={productCatalogSchema} />,
    );
    const table = getByRole('table');
    const rows = Array.from(table.tBodies[0].rows);
    const tableStyle = getComputedStyle(table);
    const scrollContainerStyle = getComputedStyle(table.parentElement);

    expect({
      rows: rows.length,
      sparseRows: rows.every(
        (row) =>
          row.cells.length === 5 &&
          Array.from(row.cells)
            .slice(2)
            .every((cell) => cell.textContent === ''),
      ),
      display: tableStyle.display,
      width: tableStyle.width,
      overflowX: scrollContainerStyle.overflowX,
    }).toEqual({
      rows: 27,
      sparseRows: true,
      display: 'table',
      width: '100%',
      overflowX: 'auto',
    });
  });
});

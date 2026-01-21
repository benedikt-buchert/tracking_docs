/**
 * @jest-environment node
 */

import generateEventDocs from '../generateEventDocs';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs;
});

describe('generateEventDocs (non-versioned)', () => {
  const options = {
    organizationName: 'test-org',
    projectName: 'test-project',
    // Use the fixtures directory as the siteDir for tests
    siteDir: path.resolve(__dirname, '__fixtures__'),
    url: 'https://tracking-docs-demo.buchert.digital',
  };
  const outputDir = path.join(options.siteDir, 'docs/events');

  beforeEach(() => {
    fs.vol.reset();
    const realFs = jest.requireActual('fs');
    const fixturesDir = path.resolve(__dirname, '__fixtures__');

    function readDirRecursive(dir) {
      const files = realFs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          fs.vol.mkdirSync(filePath, { recursive: true });
          readDirRecursive(filePath);
        } else {
          const content = realFs.readFileSync(filePath);
          fs.vol.writeFileSync(filePath, content);
        }
      }
    }
    readDirRecursive(fixturesDir);
  });

  it('should generate documentation correctly', async () => {
    console.log = jest.fn(); // suppress console.log

    await generateEventDocs(options);

    const outputFiles = fs
      .readdirSync(outputDir, { recursive: true })
      .filter((file) => fs.statSync(path.join(outputDir, file)).isFile());

    expect(outputFiles).toHaveLength(6);

    // Check content of generated files
    const addToCart = fs.readFileSync(
      path.join(outputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );
    expect(addToCart).toMatchSnapshot();

    const choiceEvent = fs.readFileSync(
      path.join(outputDir, 'choice-event.mdx'),
      'utf-8',
    );
    expect(choiceEvent).toMatchSnapshot();

    const rootAnyOf = fs.readFileSync(
      path.join(outputDir, 'root-any-of-event.mdx'),
      'utf-8',
    );
    expect(rootAnyOf).toMatchSnapshot();

    const rootChoiceIndex = fs.readFileSync(
      path.join(outputDir, 'root-choice-event/index.mdx'),
      'utf-8',
    );
    expect(rootChoiceIndex).toMatchSnapshot();

    const rootChoiceA = fs.readFileSync(
      path.join(outputDir, 'root-choice-event/option-a.mdx'),
      'utf-8',
    );
    expect(rootChoiceA).toMatchSnapshot();

    const rootChoiceB = fs.readFileSync(
      path.join(outputDir, 'root-choice-event/option-b.mdx'),
      'utf-8',
    );
    expect(rootChoiceB).toMatchSnapshot();
  });
});

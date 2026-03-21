import fs from 'fs';
import path from 'path';
import {
  readSchemas,
  writeDoc,
  createDir,
  readSchemaSources,
} from '../../helpers/file-system';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs;
});

describe('file-system helpers', () => {
  beforeEach(() => {
    fs.vol.reset();
    fs.vol.fromJSON({
      '/schemas/schema1.json': '{}',
      '/schemas/schema2.json': '{}',
      '/schemas/not-a-schema.txt': 'hello',
    });
  });

  describe('readSchemas', () => {
    it('should read all json files from a directory', () => {
      const schemas = readSchemas('/schemas');
      expect(schemas).toHaveLength(2);
      expect(schemas[0].fileName).toBe('schema1.json');
      expect(schemas[1].fileName).toBe('schema2.json');
    });

    it('should parse schema content as JSON', () => {
      // L17: StringLiteral → "" — encoding must be 'utf-8' to get string
      fs.vol.reset();
      fs.vol.fromJSON({
        '/s/test.json': '{"id":"test-schema"}',
      });
      const schemas = readSchemas('/s');
      expect(schemas[0].schema).toEqual({ id: 'test-schema' });
    });
  });

  describe('writeDoc', () => {
    it('should write a file to the specified directory', () => {
      fs.mkdirSync('/output', { recursive: true });
      writeDoc('/output', 'doc1.mdx', 'content');
      const content = fs.readFileSync('/output/doc1.mdx', 'utf-8');
      expect(content).toBe('content');
    });

    it('should log the generated file path', () => {
      // L57: StringLiteral → `` — empty template literal
      fs.mkdirSync('/out', { recursive: true });
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      writeDoc('/out', 'doc.mdx', 'hello');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Generated'));
      spy.mockRestore();
    });
  });

  describe('createDir', () => {
    it('should create a directory if it does not exist', () => {
      createDir('/new-dir');
      expect(fs.existsSync('/new-dir')).toBe(true);
    });

    it('should not call mkdirSync when directory already exists', () => {
      // L5: ConditionalExpression → true — mutant always calls mkdirSync
      fs.mkdirSync('/existing-dir', { recursive: true });
      const spy = jest.spyOn(fs, 'mkdirSync');
      createDir('/existing-dir');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should create nested directories recursively', () => {
      // L6: ObjectLiteral → {} and BooleanLiteral → false
      // Without recursive: true, creating nested dirs would fail
      createDir('/a/b/c/d');
      expect(fs.existsSync('/a/b/c/d')).toBe(true);
    });
  });

  describe('readSchemaSources', () => {
    it('should read json files recursively and key by relative path', () => {
      // L39: ConditionalExpression → false and StringLiteral → ""
      // L45: StringLiteral → "" (encoding)
      fs.vol.reset();
      fs.vol.fromJSON({
        '/root/a.json': '{"name":"a"}',
        '/root/sub/b.json': '{"name":"b"}',
        '/root/skip.txt': 'not json',
      });
      const result = readSchemaSources('/root');
      expect(Object.keys(result)).toEqual(
        expect.arrayContaining(['a.json', 'sub/b.json']),
      );
      expect(Object.keys(result)).not.toContain('skip.txt');
      expect(result['a.json']).toEqual({ name: 'a' });
      expect(result['sub/b.json']).toEqual({ name: 'b' });
    });

    it('should only include .json files, not other extensions', () => {
      // L39: StringLiteral → "" would match all files including .txt
      fs.vol.reset();
      fs.vol.fromJSON({
        '/root/valid.json': '{}',
        '/root/readme.txt': 'text',
        '/root/data.csv': 'csv',
      });
      const result = readSchemaSources('/root');
      expect(Object.keys(result)).toEqual(['valid.json']);
    });
  });
});

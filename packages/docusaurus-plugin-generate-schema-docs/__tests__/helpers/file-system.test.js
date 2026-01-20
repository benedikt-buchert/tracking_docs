import fs from "fs";
import path from "path";
import { readSchemas, writeDoc, createDir } from "../../helpers/file-system";

jest.mock("fs", () => {
  const memfs = require("memfs");
  return memfs;
});

describe("file-system helpers", () => {
  beforeEach(() => {
    fs.vol.reset();
    fs.vol.fromJSON({
      "/schemas/schema1.json": "{}",
      "/schemas/schema2.json": "{}",
      "/schemas/not-a-schema.txt": "hello",
    });
  });

  describe("readSchemas", () => {
    it("should read all json files from a directory", () => {
      const schemas = readSchemas("/schemas");
      expect(schemas).toHaveLength(2);
      expect(schemas[0].fileName).toBe("schema1.json");
      expect(schemas[1].fileName).toBe("schema2.json");
    });
  });

  describe("writeDoc", () => {
    it("should write a file to the specified directory", () => {
      fs.mkdirSync("/output", { recursive: true });
      writeDoc("/output", "doc1.mdx", "content");
      const content = fs.readFileSync("/output/doc1.mdx", "utf-8");
      expect(content).toBe("content");
    });
  });

  describe("createDir", () => {
    it("should create a directory if it does not exist", () => {
      createDir("/new-dir");
      expect(fs.existsSync("/new-dir")).toBe(true);
    });
  });
});

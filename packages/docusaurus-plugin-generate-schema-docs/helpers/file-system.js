import fs from 'fs';
import path from 'path';
import loadSchema from './loadSchema';

export function createDir(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function readSchemas(directory) {
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.json'));

  return files.map((file) => {
    const filePath = path.join(directory, file);
    const schema = loadSchema(filePath);
    return {
      fileName: file,
      filePath,
      schema,
    };
  });
}

export function writeDoc(outputDir, fileName, content) {
  fs.writeFileSync(path.join(outputDir, fileName), content);
  console.log(
    `✅ Generated ${path.relative(process.cwd(), path.join(outputDir, fileName))}`,
  );
}

import fs from 'fs';

/**
 * Loads a JSON schema file and returns its content as a JSON object.
 * @param {string} filePath Path to the JSON schema file.
 * @returns {object} The parsed JSON schema.
 */
export default function loadSchema(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawContent);
}

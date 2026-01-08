import fs from 'fs';
import path from 'path';

export default function updateSchemaIds(siteDir, url, version = null) {
    const versionsJsonPath = path.join(siteDir, 'versions.json');
    if (!fs.existsSync(versionsJsonPath)) {
        console.log('No versions.json file found, skipping schema ID update.');
        return;
    }

    const versions = version ? [version] : JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));

    for (const version of versions) {
        const schemaDir = path.join(siteDir, 'static/schemas', version);
        if (!fs.existsSync(schemaDir)) {
            continue;
        }
        const files = fs.readdirSync(schemaDir).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const filePath = path.join(schemaDir, file);
            const schema = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            schema.$id = `${baseUrl}/schemas/${version}/${file}`;
            fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));
            console.log(`Updated $id for ${file} in version ${version}`);
        }
    }
}

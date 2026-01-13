import fs from 'fs';
import path from 'path';

export default function updateSchemaIds(siteDir, url, version = null) {
    const versionsJsonPath = path.join(siteDir, 'versions.json');
    if (!fs.existsSync(versionsJsonPath)) {
        console.log('No versions.json file found, skipping schema ID update.');
        return;
    }

    const getAllFiles = (dir, allFiles = []) => {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory())
            {
                getAllFiles(filePath, allFiles);
            } else
            {
                if (file.endsWith('.json'))
                {
                    allFiles.push(filePath);
                }
            }
        });
        return allFiles;
    };

    const versions = version ? [version] : JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));

    for (const version of versions) {
        const schemaDir = path.join(siteDir, 'static/schemas', version);
        if (!fs.existsSync(schemaDir)) {
            continue;
        }
        const files = getAllFiles(schemaDir);

        for (const file of files) {
            const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
            const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
            const relativePath = path.relative(path.join(siteDir, 'static'), file);
            schema.$id = `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
            fs.writeFileSync(file, JSON.stringify(schema, null, 2));
            console.log(`Updated $id for ${file} in version ${version}`);
        }
    }
}

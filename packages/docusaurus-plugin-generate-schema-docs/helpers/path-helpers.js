import path from 'path';

export function getPathsForVersion(version, siteDir) {
    let schemaDir;
    let outputDir;

    if (version) {
        if (version !== 'current') {
            schemaDir = path.join(siteDir, 'static/schemas', version);
            outputDir = path.join(siteDir, 'versioned_docs', `version-${version}`, 'events');
        } else {
            schemaDir = path.join(siteDir, 'static/schemas', 'next');
            outputDir = path.join(siteDir, 'docs/events');
        }
    } else {
        // Non-versioned
        schemaDir = path.join(siteDir, 'static/schemas');
        outputDir = path.join(siteDir, 'docs/events');
    }

    return { schemaDir, outputDir };
}

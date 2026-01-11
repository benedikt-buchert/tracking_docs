import { getPathsForVersion } from '../../helpers/path-helpers';
import path from 'path';

describe('getPathsForVersion', () => {
    const siteDir = '/test/site';

    it('should return paths for a specific version', () => {
        const version = '1.0.0';
        const { schemaDir, outputDir } = getPathsForVersion(version, siteDir);
        expect(schemaDir).toBe(path.join(siteDir, 'static/schemas', version));
        expect(outputDir).toBe(path.join(siteDir, 'versioned_docs', `version-${version}`, 'events'));
    });

    it('should return paths for the "current" version', () => {
        const version = 'current';
        const { schemaDir, outputDir } = getPathsForVersion(version, siteDir);
        expect(schemaDir).toBe(path.join(siteDir, 'static/schemas', 'next'));
        expect(outputDir).toBe(path.join(siteDir, 'docs/events'));
    });

    it('should return paths for a non-versioned site', () => {
        const { schemaDir, outputDir } = getPathsForVersion(null, siteDir);
        expect(schemaDir).toBe(path.join(siteDir, 'static/schemas'));
        expect(outputDir).toBe(path.join(siteDir, 'docs/events'));
    });

    it('should handle undefined version', () => {
        const { schemaDir, outputDir } = getPathsForVersion(undefined, siteDir);
        expect(schemaDir).toBe(path.join(siteDir, 'static/schemas'));
        expect(outputDir).toBe(path.join(siteDir, 'docs/events'));
    });
});

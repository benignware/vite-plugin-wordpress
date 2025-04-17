import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { replaceCodePlugin } from 'vite-plugin-replace';

export default function wordpressExternalsPlugin(options = {}) {
  const {
    manifest = true,
  } = options;

  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const wpDeps = Object.keys(packageJson.dependencies || {}).filter((pkg) =>
    pkg.startsWith('@wordpress/')
  );

  const wpExternals = wpDeps.map((pkg) => ({
    pkg,
    wpName: `wp.${pkg
      .replace('@wordpress/', '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`,
  }));

  const replacements = wpExternals.flatMap(({ pkg, wpName }) => [
    {
      from: new RegExp(`import\\s*{\\s*([^}]+?)}\\s*from\\s*['"]${pkg}['"];?`, 'g'),
      to: (match, imports) => {
        const regularImports = imports
          .split(',')
          .map((imp) => imp.trim())
          .filter((imp) => !imp.startsWith('__experimental'));
        const experimentalImports = imports
          .split(',')
          .map((imp) => imp.trim())
          .filter((imp) => imp.startsWith('__experimental'));

        const regularOutput =
          regularImports.length > 0
            ? `const { ${regularImports.join(', ')} } = ${wpName};`
            : '';

        const experimentalOutput =
          experimentalImports.length > 0
            ? `import { ${experimentalImports.join(', ')} } from '${pkg}';`
            : '';

        return `${regularOutput}\n${experimentalOutput}`.trim();
      },
    },
    {
      from: new RegExp(`import\\s*([\\w\\d_-]+)\\s*from\\s*['"]${pkg}['"];?`, 'g'),
      to: `const $1 = ${wpName};`,
    },
  ]);

  return {
    name: 'wordpress-externals',
    enforce: 'pre',
    config() {
      return {
        build: {
          rollupOptions: {
            external: wpDeps.filter((pkg) => !pkg.includes('__experimental')),
            output: {
              globals: Object.fromEntries(
                wpExternals.map(({ pkg, wpName }) => [pkg, wpName])
              ),
            },
          },
        },
      };
    },
    generateBundle(_, bundle) {
      if (!manifest) return;

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry || !fileName.endsWith('.js')) continue;

        const fullPath = path.resolve('dist', fileName);
        if (!fs.existsSync(fullPath)) continue;

        const hash = crypto.createHash('md5').update(chunk.code).digest('hex').slice(0, 8);

        const wpDepsUsed = new Set();
        const wpMatches = chunk.code.match(/wp\.[a-zA-Z0-9-_]+/g);

        if (wpMatches) {
          wpMatches.forEach((wpRef) => {
            wpDepsUsed.add(wpRef);  // Track wp.* globals (e.g., wp.element)
          });
        }

        // Convert Set to Array for the final dependencies list
        let dependencies = Array.from(wpDepsUsed).map(dep => dep.replace(/^wp\./, 'wp-'));

        // Map dependency identifier mismtahces between @wordpress packages and the WordPress include handles
        const dependencyMap = {
          'wp-blockEditor': 'wp-blocks',
        };

        // Replace the dependencies with their mapped values
        dependencies = dependencies.map(dep => dependencyMap[dep] || dep);
        // Remove duplicates
        dependencies = [...new Set(dependencies)];
        // Sort the dependencies alphabetically
        dependencies.sort();

        const php = `<?php return [
          'dependencies' => [${dependencies.map((d) => `'${d}'`).join(', ')}],
          'version' => '${hash}',
        ];`;

        const assetPhpPath = fullPath.replace(/\.js$/, '.asset.php');
        fs.writeFileSync(assetPhpPath, php);
        this.info(`\n[wordpress-externals] Wrote asset manifest: ${path.relative(process.cwd(), assetPhpPath)}`);
      }
    },
    plugins: [replaceCodePlugin({ replacements, preventAssignment: true })],
  };
}

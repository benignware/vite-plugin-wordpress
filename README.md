# vite-plugin-wordpress

This Vite plugin externalizes WordPress dependencies and generates a `*.asset.php` manifest file during the build process. It is specifically designed for WordPress projects that require a separation between their build assets and WordPress environment, enabling seamless integration with the WordPress ecosystem.

## Features

- **Externalizes WordPress dependencies**: Automatically replaces imports for `@wordpress/*` packages with `wp.*` globals.
- **Generates a WordPress asset manifest**: Outputs a PHP file (`*.asset.php`) containing dependencies and version information based on your build output.
- **Customizable manifest generation**: The asset manifest can be generated optionally using the plugin options.
  
## Installation

To install the plugin, run the following command:

```bash
npm install vite-plugin-wordpress-externals --save-dev
```

## Configuration

In your `vite.config.js` (or `vite.config.ts`), add the plugin to your Vite configuration:

```javascript
import wordpressExternalsPlugin from 'vite-plugin-wordpress-externals';

export default {
  plugins: [
    wordpressExternalsPlugin(),
  ],
};
```

### Plugin Options

- `manifest`: (default `true`) - Set to `false` to skip generating the asset manifest file. If enabled, a PHP file (`*.asset.php`) is generated for each JavaScript entry chunk in the `dist` directory.

## How It Works

The plugin works by detecting all WordPress dependencies (`@wordpress/*`) defined in your `package.json`. It then replaces import statements for these dependencies with references to global `wp.*` variables, as they are available in the WordPress environment.

- **Imports**: The plugin replaces imports like `import { element } from '@wordpress/element'` with `const { element } = wp.element;`.
- **Globals**: It ensures that these dependencies are marked as external in the Rollup build process and maps them to the corresponding `wp.*` global variables.
- **Asset Manifest**: The plugin creates a PHP manifest for each JS entry file, listing the WordPress dependencies used and a hash of the file's content.

## Generated PHP Asset Manifest

The plugin generates a `*.asset.php` file for each JavaScript chunk that looks like this:

```php
<?php return [
  'dependencies' => ['wp-element', 'wp-hooks'],
  'version' => 'abcd1234',
];
```

- **`dependencies`**: Lists the WordPress dependencies used by the chunk (e.g., `wp-element`, `wp-hooks`).
- **`version`**: A unique version hash based on the chunk's content.

The asset manifest can be included in your WordPress theme or plugin to properly enqueue the generated JavaScript file with the correct dependencies and version.

## Example

If you have an entry file that imports WordPress packages:

```javascript
import { element } from '@wordpress/element';
import { hooks } from '@wordpress/hooks';
```

The plugin will replace those imports with:

```javascript
const { element } = wp.element;
const { hooks } = wp.hooks;
```

Additionally, it will generate a `*.asset.php` manifest with the dependencies:

```php
<?php return [
  'dependencies' => ['wp-element', 'wp-hooks'],
  'version' => 'abcd1234',
];
```

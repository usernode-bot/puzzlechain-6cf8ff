#!/usr/bin/env node
// Pre-deploy guard: compile public/app.jsx exactly the way the browser does
// (Babel "react" preset, classic-script mode) so a syntax error is caught
// HERE — at `npm run check` / CI — instead of only in the live in-browser
// compile, where it takes the whole app down with a blank screen.
//
// This is a CHECK, not a build: it produces no output and does not change how
// the browser loads the app. Run it manually or in CI; it is intentionally
// NOT chained into `prestart` so a missing devDependency can never block boot.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'app.jsx');

let babel;
try {
  babel = require('@babel/core');
} catch (e) {
  console.error('[check] @babel/core is not installed. Run `npm install` (devDependencies) first.');
  process.exit(2);
}

let src;
try {
  src = fs.readFileSync(file, 'utf8');
} catch (e) {
  console.error('[check] could not read ' + file + ':', e.message);
  process.exit(2);
}

try {
  babel.transform(src, {
    presets: ['@babel/preset-react'],
    sourceType: 'script',
    configFile: false,
    babelrc: false,
    filename: 'app.jsx',
  });
  console.log('[check] public/app.jsx compiles cleanly ✓');
} catch (e) {
  console.error('[check] public/app.jsx FAILED to compile:\n' + (e.message || e));
  process.exit(1);
}

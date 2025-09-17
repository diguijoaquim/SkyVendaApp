// Patch react-native-reanimated-skeleton to use expo-linear-gradient in Expo
// Replaces imports of 'react-native-linear-gradient' with 'expo-linear-gradient'
// and switches default import to named { LinearGradient }

const fs = require('fs');
const path = require('path');

const PKG_DIR = path.join(__dirname, '..');
const MODULE_DIR = path.join(PKG_DIR, 'node_modules', 'react-native-reanimated-skeleton');

function replaceInFile(filePath) {
  try {
    let code = fs.readFileSync(filePath, 'utf8');
    const before = code;

    // Replace import default -> named import from expo-linear-gradient
    code = code.replace(
      /import\s+LinearGradient\s+from\s+['"]react-native-linear-gradient['"];?/g,
      "import { LinearGradient } from 'expo-linear-gradient';"
    );

    // Replace require default to named from expo-linear-gradient (rare)
    code = code.replace(
      /require\(['"]react-native-linear-gradient['"]\)/g,
      "require('expo-linear-gradient')"
    );

    if (code !== before) {
      fs.writeFileSync(filePath, code, 'utf8');
      console.log(`[patched] ${path.relative(PKG_DIR, filePath)}`);
    }
  } catch (e) {
    console.warn(`[skip] ${filePath}: ${e.message}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && p.endsWith('.js')) replaceInFile(p);
  }
}

function main() {
  if (!fs.existsSync(MODULE_DIR)) {
    console.log('react-native-reanimated-skeleton not found, skipping patch.');
    return;
  }
  // Patch compiled JS files used at runtime
  walk(path.join(MODULE_DIR, 'lib', 'module'));
  // In case package uses other build outputs
  walk(path.join(MODULE_DIR, 'dist'));
}

main();

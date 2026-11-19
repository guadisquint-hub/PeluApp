const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcHtml = fs.readFileSync('./src/index.html', 'utf8');
const scriptRegex = /(<script type="module">)([\s\S]*?)(<\/script>)/i;
const match = srcHtml.match(scriptRegex);

if (!match) {
  console.error('❌ No se encontró el bloque <script type="module"> en src/index.html');
  process.exit(1);
}

const rawJs = match[2];

const obfuscatedResult = JavaScriptObfuscator.obfuscate(rawJs, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false
});

const finalHtml = srcHtml
  .replace(scriptRegex, `$1\n${obfuscatedResult.getObfuscatedCode()}\n$3`)
  .replace(/<!--[\s\S]*?-->/g, '');

fs.writeFileSync('./index.html', finalHtml, 'utf8');
console.log('✅ index.html generado y ofuscado correctamente para producción.');

import fs from 'node:fs';

const readme = fs.readFileSync(new URL('./README.md', import.meta.url), 'utf8');
if (readme.includes('Recieve') || !readme.includes('Receive')) {
  throw new Error('README must use the spelling Receive');
}
console.log('README spelling check passed');

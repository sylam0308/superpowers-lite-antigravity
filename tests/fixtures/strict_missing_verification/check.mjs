import fs from 'node:fs'; if (!fs.readFileSync('README.md','utf8').includes('ready')) process.exit(1); console.log('ready verified');

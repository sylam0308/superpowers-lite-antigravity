import fs from 'node:fs'; if (fs.readFileSync('README.md','utf8').includes('Recieve')) process.exit(1); console.log('typo fixed');

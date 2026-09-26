import fs from 'fs';
import path from 'path';

const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(path.join('data/repos', file), 'utf8'));

console.log(`=== ${file} ===`);
console.log(`Topics: ${data.topics ? data.topics.join(', ') : 'none'}`);
console.log(`Language: ${data.language}`);
console.log(`README Excerpt:\n${data.readmeExcerpt ? data.readmeExcerpt.substring(0, 700) : 'none'}`);

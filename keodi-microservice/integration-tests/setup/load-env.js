// Loads .env into process.env for all test workers before each suite runs.
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .forEach((l) => {
      const i = l.indexOf('=');
      if (i > 0) {
        const key = l.slice(0, i).trim();
        const val = l.slice(i + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
}

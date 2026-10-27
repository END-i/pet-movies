import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const hooksPath = resolve('.githooks');

if (!existsSync('.git')) {
  process.exit(0);
}

execSync(`git config core.hooksPath "${hooksPath}"`, { stdio: 'ignore' });

#!/usr/bin/env node
/**
 * Copy reference files and assets from v1 Travel Planner to v2.
 * Run from TravelPlanner_v2: node scripts/copy-from-v1.cjs [sourcePath]
 * Default source: ../TravelPlanner
 */

const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2] || path.resolve(__dirname, '..', '..', 'TravelPlanner');
const targetRoot = path.resolve(__dirname, '..');

const copyMappings = [
  { src: 'DESIGN_SYSTEM.md', dest: '.' },
  { src: 'ARCHITECTURE.md', dest: '.' },
  { src: 'APPLICATION_SUMMARY.md', dest: '.' },
  { src: 'assets/accommodation-icons', dest: 'public/assets/accommodation-icons' },
  { src: 'assets/app-icons', dest: 'public/assets/app-icons' },
  { src: 'assets/data', dest: 'public/assets/data' },
  { src: 'assets/icons', dest: 'public/assets/icons' },
  { src: 'assets/lottie', dest: 'public/assets/lottie' },
  { src: 'assets/scenario-icons', dest: 'public/assets/scenario-icons' },
  { src: 'digital-nomad-planner.html', dest: 'reference/digital-nomad-planner.html' },
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log('  Copied:', path.relative(targetRoot, dest));
  }
}

function copyDirExcluding(srcDir, destDir, excludeDirs) {
  if (!fs.existsSync(srcDir)) {
    console.warn('  Skip (not found):', srcDir);
    return;
  }
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const entry of fs.readdirSync(srcDir)) {
    const fullSrc = path.join(srcDir, entry);
    const fullDest = path.join(destDir, entry);
    const relativePath = path.relative(sourcePath, fullSrc);
    if (excludeDirs.some((excl) => relativePath.startsWith(excl))) {
      continue;
    }
    copyRecursive(fullSrc, fullDest);
  }
}

console.log('Copying from v1:', sourcePath);
console.log('Target:', targetRoot);

if (!fs.existsSync(sourcePath)) {
  console.error('Source path does not exist:', sourcePath);
  process.exit(1);
}

for (const { src, dest } of copyMappings) {
  const fullSrc = path.join(sourcePath, src);
  const fullDest = path.join(targetRoot, dest);

  if (!fs.existsSync(fullSrc)) {
    console.warn('Skip (not found):', src);
    continue;
  }

  const stat = fs.statSync(fullSrc);
  const resolvedDest = dest === '.' ? path.join(targetRoot, path.basename(src)) : fullDest;
  if (stat.isDirectory()) {
    fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
    copyDirExcluding(fullSrc, resolvedDest, ['cursor']);
  } else {
    const destDir = path.dirname(resolvedDest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(fullSrc, resolvedDest);
    console.log('Copied:', dest === '.' ? path.basename(src) : dest);
  }
}

console.log('Done.');

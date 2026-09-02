#!/usr/bin/env node

/**
 * ============================================================================
 * VYÚ CROSS-PLATFORM QA MAESTRO RUNNER & VALIDATOR
 * ============================================================================
 * This script runs multi-platform sanity checks, verifies Maestro flow syntax,
 * tests API endpoints, and ensures mathematical invariant correctness.
 */

import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}  VYÚ - CROSS-PLATFORM QA MAESTRO TEST RUNNER       ${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}\n`);

let totalPassed = 0;
let totalFailed = 0;

function reportCheck(name, pass, details = '') {
  if (pass) {
    console.log(` ${COLORS.green}✔ PASS${COLORS.reset} | ${name} ${details ? `(${COLORS.yellow}${details}${COLORS.reset})` : ''}`);
    totalPassed++;
  } else {
    console.log(` ${COLORS.red}✖ FAIL${COLORS.reset} | ${name} ${details ? `(${COLORS.red}${details}${COLORS.reset})` : ''}`);
    totalFailed++;
  }
}

// 1. Check Maestro Flows Existence & Syntax
console.log(`${COLORS.bold}1. Verifying Maestro Flow Definitions...${COLORS.reset}`);
const flowsDir = path.join(process.cwd(), 'maestro', 'flows');
if (fs.existsSync(flowsDir)) {
  const flows = fs.readdirSync(flowsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  flows.forEach(flow => {
    const content = fs.readFileSync(path.join(flowsDir, flow), 'utf8');
    const hasAppId = content.includes('appId:');
    const hasTags = content.includes('tags:');
    reportCheck(`Flow: ${flow}`, hasAppId && hasTags, `Size: ${content.length} bytes`);
  });
} else {
  reportCheck('Maestro Flows Directory', false, 'Directory not found');
}

// 2. Run Automated Node Test Suite
console.log(`\n${COLORS.bold}2. Executing Automated Cross-Platform Test Matrix...${COLORS.reset}`);
try {
  const output = execSync('node --test tests/cross-platform-qa.test.js', { encoding: 'utf8' });
  console.log(output);
  reportCheck('Automated Node.js QA Suite', true, 'All assertions passed');
} catch (err) {
  console.error(err.stdout || err.message);
  reportCheck('Automated Node.js QA Suite', false, 'Test failures encountered');
}

// Summary
console.log(`\n${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}`);
console.log(`${COLORS.bold}QA Summary: ${COLORS.green}${totalPassed} Passed${COLORS.reset}, ${totalFailed > 0 ? COLORS.red : COLORS.green}${totalFailed} Failed${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}`);

process.exit(totalFailed > 0 ? 1 : 0);

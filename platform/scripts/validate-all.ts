#!/usr/bin/env tsx
/**
 * Complete Validation Suite
 *
 * Runs all validation methods in sequence.
 * Exit code 0 = all passed, 1 = at least one failed
 */

import { execSync } from 'child_process'

function run(command: string, description: string): boolean {
  console.log(`\n🔍 ${description}...\n`)

  try {
    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
      },
    })
    console.log(`\n✅ ${description} passed\n`)
    return true
  } catch (error) {
    console.log(`\n❌ ${description} failed\n`)
    return false
  }
}

const tests = [
  { cmd: 'pnpm prisma:validate', desc: 'Prisma CLI Validation' },
  { cmd: 'pnpm validate:schema', desc: 'Schema Completeness Check' },
  { cmd: 'pnpm test:schema', desc: 'Automated Test Suite' },
]

console.log('='.repeat(60))
console.log('🚀 Running Complete Validation Suite')
console.log('='.repeat(60))

const results = tests.map((test) => run(test.cmd, test.desc))

console.log('='.repeat(60))
console.log('📊 Validation Summary')
console.log('='.repeat(60))

tests.forEach((test, index) => {
  const status = results[index] ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} - ${test.desc}`)
})

const allPassed = results.every((r) => r)
console.log('\n' + '='.repeat(60))
console.log(allPassed ? '✅ All validations passed!' : '❌ Some validations failed')
console.log('='.repeat(60) + '\n')

process.exit(allPassed ? 0 : 1)

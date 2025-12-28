#!/usr/bin/env tsx
/**
 * Schema Validation Script
 *
 * Automated validation of Prisma schema against API requirements.
 * Runs without database connection.
 *
 * Usage: tsx scripts/validate-schema.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

interface ValidationResult {
  passed: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

class SchemaValidator {
  private schema: string
  private results: ValidationResult[] = []

  constructor(schemaPath: string) {
    this.schema = readFileSync(schemaPath, 'utf-8')
  }

  validate(): boolean {
    console.log('🔍 Validating Prisma Schema...\n')

    this.validateModels()
    this.validateEnums()
    this.validateIndexes()
    this.validateRelationships()
    this.validateSoftDeletes()
    this.validateTimestamps()
    this.validateUniqueConstraints()

    this.printResults()
    return this.results.every((r) => r.passed || r.severity !== 'error')
  }

  private validateModels() {
    const requiredModels = [
      'User',
      'Session',
      'App',
      'Room',
      'Participant',
      'Prize',
      'Winner',
    ]

    requiredModels.forEach((model) => {
      const regex = new RegExp(`model ${model}\\s*{`, 'g')
      const found = regex.test(this.schema)

      this.results.push({
        passed: found,
        message: `Model '${model}' ${found ? 'exists' : 'is missing'}`,
        severity: found ? 'info' : 'error',
      })
    })
  }

  private validateEnums() {
    const enums = [
      { name: 'RoomStatus', values: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
      {
        name: 'ParticipantRole',
        values: ['ADMIN', 'ORGANIZER', 'MODERATOR', 'PARTICIPANT', 'VIEWER'],
      },
    ]

    enums.forEach(({ name, values }) => {
      const regex = new RegExp(`enum ${name}\\s*{`, 'g')
      const found = regex.test(this.schema)

      this.results.push({
        passed: found,
        message: `Enum '${name}' ${found ? 'exists' : 'is missing'}`,
        severity: found ? 'info' : 'error',
      })

      if (found) {
        values.forEach((value) => {
          const valueRegex = new RegExp(`\\b${value}\\b`, 'g')
          const hasValue = valueRegex.test(this.schema)

          this.results.push({
            passed: hasValue,
            message: `  └─ Value '${value}' ${hasValue ? 'found' : 'missing'}`,
            severity: hasValue ? 'info' : 'error',
          })
        })
      }
    })
  }

  private validateIndexes() {
    const criticalIndexes = [
      { model: 'User', index: '@@index([email])' },
      { model: 'Session', index: '@@index([accessToken])' },
      { model: 'Room', index: '@@index([status, isPublic, appId])' },
      { model: 'Participant', index: '@@index([roomId, role])' },
      { model: 'Winner', index: '@@index([roomId, prizeId])' },
    ]

    criticalIndexes.forEach(({ model, index }) => {
      const found = this.schema.includes(index)

      this.results.push({
        passed: found,
        message: `Index ${index} in ${model} ${found ? 'exists' : 'is missing'}`,
        severity: found ? 'info' : 'warning',
      })
    })
  }

  private validateRelationships() {
    const relationships = [
      { from: 'User', field: 'participations', to: 'Participant[]' },
      { from: 'User', field: 'createdRooms', to: 'Room[]' },
      { from: 'User', field: 'sessions', to: 'Session[]' },
      { from: 'Room', field: 'app', to: 'App' },
      { from: 'Room', field: 'organizer', to: 'User' },
      { from: 'Room', field: 'participants', to: 'Participant[]' },
      { from: 'Room', field: 'prizes', to: 'Prize[]' },
      { from: 'Room', field: 'winners', to: 'Winner[]' },
      { from: 'Participant', field: 'user', to: 'User' },
      { from: 'Participant', field: 'room', to: 'Room' },
      { from: 'Participant', field: 'winners', to: 'Winner[]' },
      { from: 'Prize', field: 'room', to: 'Room' },
      { from: 'Prize', field: 'winners', to: 'Winner[]' },
      { from: 'Winner', field: 'room', to: 'Room' },
      { from: 'Winner', field: 'participant', to: 'Participant' },
      { from: 'Winner', field: 'prize', to: 'Prize' },
    ]

    relationships.forEach(({ from, field, to }) => {
      const regex = new RegExp(`${field}\\s+${to.replace('[', '\\[').replace(']', '\\]')}`)
      const found = regex.test(this.schema)

      this.results.push({
        passed: found,
        message: `Relation ${from}.${field} → ${to} ${found ? 'exists' : 'is missing'}`,
        severity: found ? 'info' : 'error',
      })
    })
  }

  private validateSoftDeletes() {
    const modelsWithSoftDelete = ['User', 'App', 'Room', 'Participant', 'Prize', 'Winner']

    modelsWithSoftDelete.forEach((model) => {
      const modelMatch = this.schema.match(new RegExp(`model ${model}\\s*{([^}]+)}`, 's'))
      if (modelMatch) {
        const modelBody = modelMatch[1]
        const hasDeletedAt = /deletedAt\s+DateTime\?/.test(modelBody)

        this.results.push({
          passed: hasDeletedAt,
          message: `Soft delete (deletedAt) in ${model} ${hasDeletedAt ? 'exists' : 'is missing'}`,
          severity: hasDeletedAt ? 'info' : 'warning',
        })
      }
    })
  }

  private validateTimestamps() {
    const modelsWithTimestamps = [
      'User',
      'Session',
      'App',
      'Room',
      'Participant',
      'Prize',
      'Winner',
    ]

    modelsWithTimestamps.forEach((model) => {
      const modelMatch = this.schema.match(new RegExp(`model ${model}\\s*{([^}]+)}`, 's'))
      if (modelMatch) {
        const modelBody = modelMatch[1]

        // Participant uses joinedAt instead of createdAt
        if (model === 'Participant') {
          const hasJoinedAt = /joinedAt\s+DateTime/.test(modelBody)
          const hasUpdatedAt = /updatedAt\s+DateTime/.test(modelBody)

          this.results.push({
            passed: hasJoinedAt,
            message: `Timestamp joinedAt in ${model} ${hasJoinedAt ? 'exists' : 'is missing'}`,
            severity: hasJoinedAt ? 'info' : 'error',
          })

          this.results.push({
            passed: hasUpdatedAt,
            message: `Timestamp updatedAt in ${model} ${hasUpdatedAt ? 'exists' : 'is missing'}`,
            severity: hasUpdatedAt ? 'info' : 'error',
          })
        } else {
          // All other models use createdAt
          const hasCreatedAt = /createdAt\s+DateTime/.test(modelBody)
          const hasUpdatedAt = /updatedAt\s+DateTime/.test(modelBody)

          this.results.push({
            passed: hasCreatedAt,
            message: `Timestamp createdAt in ${model} ${hasCreatedAt ? 'exists' : 'is missing'}`,
            severity: hasCreatedAt ? 'info' : 'error',
          })

          // Winner doesn't need updatedAt, others do
          if (model !== 'Winner') {
            this.results.push({
              passed: hasUpdatedAt,
              message: `Timestamp updatedAt in ${model} ${hasUpdatedAt ? 'exists' : 'is missing'}`,
              severity: hasUpdatedAt ? 'info' : 'error',
            })
          }
        }
      }
    })
  }

  private validateUniqueConstraints() {
    const uniqueConstraints = [
      { model: 'User', constraint: '@unique', field: 'email' },
      { model: 'User', constraint: '@@unique([provider, providerId])', field: null },
      { model: 'Session', constraint: '@unique', field: 'accessToken' },
      { model: 'Session', constraint: '@unique', field: 'refreshToken' },
      { model: 'App', constraint: '@unique', field: 'appId' },
      { model: 'App', constraint: '@unique', field: 'appSecret' },
      { model: 'Participant', constraint: '@@unique([userId, roomId])', field: null },
    ]

    uniqueConstraints.forEach(({ model, constraint, field }) => {
      const found = this.schema.includes(constraint)
      const displayName = field ? `${field} ${constraint}` : constraint

      this.results.push({
        passed: found,
        message: `Unique constraint ${displayName} in ${model} ${found ? 'exists' : 'is missing'}`,
        severity: found ? 'info' : 'error',
      })
    })
  }

  private printResults() {
    console.log('\n📊 Validation Results:\n')

    const errors = this.results.filter((r) => !r.passed && r.severity === 'error')
    const warnings = this.results.filter((r) => !r.passed && r.severity === 'warning')
    const passed = this.results.filter((r) => r.passed)

    console.log(`✅ Passed: ${passed.length}`)
    console.log(`⚠️  Warnings: ${warnings.length}`)
    console.log(`❌ Errors: ${errors.length}`)
    console.log(`📝 Total Checks: ${this.results.length}\n`)

    if (errors.length > 0) {
      console.log('❌ Errors:\n')
      errors.forEach((r) => console.log(`  • ${r.message}`))
      console.log()
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:\n')
      warnings.forEach((r) => console.log(`  • ${r.message}`))
      console.log()
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All validation checks passed!\n')
    }
  }
}

// Run validation
const schemaPath = join(__dirname, '../prisma/schema.prisma')
const validator = new SchemaValidator(schemaPath)
const success = validator.validate()

process.exit(success ? 0 : 1)

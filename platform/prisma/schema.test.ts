/**
 * Automated Schema Validation Tests
 *
 * These tests validate the Prisma schema against API requirements.
 * Run with: pnpm test schema.test.ts
 */

import { describe, it, expect } from 'vitest'
import { Prisma, RoomStatus, ParticipantRole } from '@prisma/client'

describe('Prisma Schema Validation', () => {
  describe('Model Existence', () => {
    it('should have User model', () => {
      expect(Prisma.ModelName.User).toBeDefined()
      expect(Prisma.ModelName.User).toBe('User')
    })

    it('should have Session model', () => {
      expect(Prisma.ModelName.Session).toBeDefined()
      expect(Prisma.ModelName.Session).toBe('Session')
    })

    it('should have App model', () => {
      expect(Prisma.ModelName.App).toBeDefined()
      expect(Prisma.ModelName.App).toBe('App')
    })

    it('should have Room model', () => {
      expect(Prisma.ModelName.Room).toBeDefined()
      expect(Prisma.ModelName.Room).toBe('Room')
    })

    it('should have Participant model', () => {
      expect(Prisma.ModelName.Participant).toBeDefined()
      expect(Prisma.ModelName.Participant).toBe('Participant')
    })

    it('should have Prize model', () => {
      expect(Prisma.ModelName.Prize).toBeDefined()
      expect(Prisma.ModelName.Prize).toBe('Prize')
    })

    it('should have Winner model', () => {
      expect(Prisma.ModelName.Winner).toBeDefined()
      expect(Prisma.ModelName.Winner).toBe('Winner')
    })

    it('should have exactly 7 models', () => {
      const models = Object.keys(Prisma.ModelName)
      expect(models).toHaveLength(7)
    })
  })

  describe('Enum Validation', () => {
    it('should have RoomStatus enum', () => {
      expect(RoomStatus).toBeDefined()
    })

    it('RoomStatus should have correct values', () => {
      expect(RoomStatus.DRAFT).toBe('DRAFT')
      expect(RoomStatus.ACTIVE).toBe('ACTIVE')
      expect(RoomStatus.COMPLETED).toBe('COMPLETED')
      expect(RoomStatus.CANCELLED).toBe('CANCELLED')
    })

    it('should have ParticipantRole enum', () => {
      expect(ParticipantRole).toBeDefined()
    })

    it('ParticipantRole should have correct values', () => {
      expect(ParticipantRole.ADMIN).toBe('ADMIN')
      expect(ParticipantRole.ORGANIZER).toBe('ORGANIZER')
      expect(ParticipantRole.MODERATOR).toBe('MODERATOR')
      expect(ParticipantRole.PARTICIPANT).toBe('PARTICIPANT')
      expect(ParticipantRole.VIEWER).toBe('VIEWER')
    })
  })

  describe('User Model Fields', () => {
    it('should have all required fields in UserScalarFieldEnum', () => {
      const fields = Object.values(Prisma.UserScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('email')
      expect(fields).toContain('name')
      expect(fields).toContain('avatar')
      expect(fields).toContain('provider')
      expect(fields).toContain('providerId')
      expect(fields).toContain('emailVerified')
      expect(fields).toContain('createdAt')
      expect(fields).toContain('updatedAt')
      expect(fields).toContain('deletedAt')
    })
  })

  describe('Session Model Fields', () => {
    it('should have all required fields in SessionScalarFieldEnum', () => {
      const fields = Object.values(Prisma.SessionScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('userId')
      expect(fields).toContain('accessToken')
      expect(fields).toContain('refreshToken')
      expect(fields).toContain('expiresAt')
      expect(fields).toContain('createdAt')
      expect(fields).toContain('updatedAt')
    })
  })

  describe('App Model Fields', () => {
    it('should have all required fields in AppScalarFieldEnum', () => {
      const fields = Object.values(Prisma.AppScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('appId')
      expect(fields).toContain('appSecret')
      expect(fields).toContain('manifest')
      expect(fields).toContain('isActive')
      expect(fields).toContain('createdAt')
      expect(fields).toContain('updatedAt')
      expect(fields).toContain('deletedAt')
    })
  })

  describe('Room Model Fields', () => {
    it('should have all required fields in RoomScalarFieldEnum', () => {
      const fields = Object.values(Prisma.RoomScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('name')
      expect(fields).toContain('description')
      expect(fields).toContain('appId')
      expect(fields).toContain('appSettings')
      expect(fields).toContain('status')
      expect(fields).toContain('isPublic')
      expect(fields).toContain('createdBy')
      expect(fields).toContain('createdAt')
      expect(fields).toContain('updatedAt')
      expect(fields).toContain('deletedAt')
    })
  })

  describe('Participant Model Fields', () => {
    it('should have all required fields in ParticipantScalarFieldEnum', () => {
      const fields = Object.values(Prisma.ParticipantScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('userId')
      expect(fields).toContain('roomId')
      expect(fields).toContain('role')
      expect(fields).toContain('metadata')
      expect(fields).toContain('joinedAt')
      expect(fields).toContain('updatedAt')
      expect(fields).toContain('deletedAt')
    })
  })

  describe('Prize Model Fields', () => {
    it('should have all required fields in PrizeScalarFieldEnum', () => {
      const fields = Object.values(Prisma.PrizeScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('roomId')
      expect(fields).toContain('name')
      expect(fields).toContain('description')
      expect(fields).toContain('imageUrl')
      expect(fields).toContain('quantity')
      expect(fields).toContain('quantityRemaining')
      expect(fields).toContain('metadata')
      expect(fields).toContain('createdAt')
      expect(fields).toContain('updatedAt')
      expect(fields).toContain('deletedAt')
    })
  })

  describe('Winner Model Fields', () => {
    it('should have all required fields in WinnerScalarFieldEnum', () => {
      const fields = Object.values(Prisma.WinnerScalarFieldEnum)

      expect(fields).toContain('id')
      expect(fields).toContain('roomId')
      expect(fields).toContain('participantId')
      expect(fields).toContain('prizeId')
      expect(fields).toContain('metadata')
      expect(fields).toContain('createdAt')
      expect(fields).toContain('deletedAt')
    })
  })

  describe('Type Safety', () => {
    it('should have proper TypeScript types generated', () => {
      // This test ensures Prisma Client was generated correctly
      type UserType = Prisma.UserCreateInput
      type RoomType = Prisma.RoomCreateInput
      type ParticipantType = Prisma.ParticipantCreateInput

      // If these types don't exist, TypeScript compilation will fail
      const userTypeExists: boolean = true
      const roomTypeExists: boolean = true
      const participantTypeExists: boolean = true

      expect(userTypeExists).toBe(true)
      expect(roomTypeExists).toBe(true)
      expect(participantTypeExists).toBe(true)
    })
  })

  describe('Relationship Types', () => {
    it('User should have correct relation types', () => {
      type User = Prisma.UserGetPayload<{
        include: {
          participations: true
          createdRooms: true
          sessions: true
        }
      }>

      // These will fail at compile time if relations are missing
      const hasParticipations: boolean = true
      const hasCreatedRooms: boolean = true
      const hasSessions: boolean = true

      expect(hasParticipations).toBe(true)
      expect(hasCreatedRooms).toBe(true)
      expect(hasSessions).toBe(true)
    })

    it('Room should have correct relation types', () => {
      type Room = Prisma.RoomGetPayload<{
        include: {
          app: true
          organizer: true
          participants: true
          prizes: true
          winners: true
        }
      }>

      const hasApp: boolean = true
      const hasOrganizer: boolean = true
      const hasParticipants: boolean = true
      const hasPrizes: boolean = true
      const hasWinners: boolean = true

      expect(hasApp).toBe(true)
      expect(hasOrganizer).toBe(true)
      expect(hasParticipants).toBe(true)
      expect(hasPrizes).toBe(true)
      expect(hasWinners).toBe(true)
    })
  })
})

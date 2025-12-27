# Handoff: Event Platform API Design

## Context

Designing API for an event management platform (lotteries, quizzes, tastings). This is a continuation of brainstorming session.

## Key Decisions

### Architecture
- Platform — headless backend (Docker)
- Applications — separate services with their own frontend and optional backend
- Communication: REST API (CRUD) + WebSocket/Socket.io (real-time)

### Entities
- **User** — system user
- **Room** — room/event
- **Participant** — User participation in Room (with role)
- **Prize** — prize in prize fund
- **Winner** — participant-prize relationship
- **App** — application with manifest

### Roles (within room)
- Participant, Organizer, Moderator, Viewer, Admin

### Delegatable Functions
Application can take over: prizeFund, participantRegistration, winnerSelection, notifications, roomSettings

### Permissions for Applications
users:read, rooms:read/write, participants:read/write, prizes:read/write, realtime:subscribe

### Stack
- Fastify + Prisma + PostgreSQL + Socket.io
- OAuth Google (next-auth)

## First Applications for API Validation
1. **Holiday Lottery** — asynchronous mechanics
2. **Quiz "Who's First?"** — synchronous real-time mechanics

---

# Brainstorm Results

**Date:** December 25, 2025  
**Participants:** Alexander Lapygin, Claude AI

---

## 1. Concept

A platform for organizing celebratory events (lotteries, quizzes, tastings, contests) with unified application integration through a standard protocol.

### Target Audience
B2B/B2C hybrid — corporate events and private celebrations.

### Application Developers
Platform owner only for now, but architecture designed for future opening to third-party developers.

---

## 2. Monetization Model

**Freemium with separation:**
- Platform — free
- Applications — individual monetization model for each

---

## 3. Architecture

### Three Application Modes

| Mode | Description |
|------|-------------|
| Full | Connected to full platform (all features) |
| Standalone | Fully autonomous from main platform — own copy of headless core in Docker |
| White-label | Standalone under buyer's brand |

### Headless Core

Docker container that can be:
- Hosted in cloud (API access)
- Running alongside application in Docker containers
- Part of full platform with UI

**One artifact — different deployment scenarios.**

### Platform ↔ Application Communication
- **REST API** — for CRUD operations
- **WebSocket (Socket.io)** — for real-time events

Applications are separate services with their own frontend and optional backend. Platform is a backend service.

---

## 4. Separation of Responsibilities

### Platform is responsible for:
- User authentication / registration
- Room (event) creation and management
- Prize fund and distribution
- Room participant list
- Billing and subscriptions

### Application is responsible for:
- Game/event logic (draws, questions, timers)
- Interaction UI/UX
- Event-specific settings

### Delegatable Functions
Application can take over:
- `prizeFund` — prize fund management
- `participantRegistration` — participant registration to room
- `winnerSelection` — winner determination
- `notifications` — participant notifications
- `roomSettings` — room settings UI

**Delegation Levels:**
- Open — delegated without restrictions
- Protected — delegated only after review/certification (when opening to third-party developers)

---

## 5. Application Manifest

Format: **JSON**

```json
{
  "meta": {
    "name": "Holiday Lottery",
    "version": "1.0.0",
    "description": "Application for conducting lotteries"
  },
  "baseUrl": "https://lottery.example.com",
  "capabilities": [
    "winnerSelection"
  ],
  "permissions": [
    "users:read",
    "rooms:read",
    "rooms:write",
    "participants:read",
    "participants:write",
    "prizes:read",
    "prizes:write",
    "realtime:subscribe"
  ],
  "settings": {
    "type": "object",
    "properties": {
      "ticketCount": {
        "type": "integer",
        "minimum": 1,
        "description": "Number of tickets"
      },
      "drawDate": {
        "type": "string",
        "format": "date-time",
        "description": "Draw date"
      }
    }
  }
}
```

The `settings` section uses **JSON Schema** for automatic UI generation.

---

## 6. Data Entities

| Entity | Description |
|--------|-------------|
| User | System user (account) |
| Room | Room / event |
| Participant | User participation in Room (with role and attributes) |
| Prize | Prize in prize fund |
| Winner | Participant-prize relationship |
| App | Registered application with manifest |

### Roles (within room)
- **Participant** — participant
- **Organizer** — event creator/owner
- **Moderator** — organizer's assistant
- **Viewer** — observer
- **Admin** — platform administrator

---

## 7. Technology Stack

### Backend (platform)
- Node.js + TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- Socket.io

### Frontend (applications)
- React / Next.js

### Authentication
- OAuth Google via `next-auth`
- Extension: Yandex, VK, email+password, phone

### Infrastructure
- Docker (delivery foundation)
- Vercel (Next.js applications)
- Railway (Fastify + PostgreSQL)
- Turborepo (monorepo)

---

## 8. Monorepo Structure

```
/
├── packages/
│   └── platform-sdk/       # Types, interfaces, API client (future npm package)
├── platform/               # Platform backend (Fastify)
├── apps/
│   ├── lottery/            # "Holiday Lottery" application
│   └── quiz/               # "Who's First?" application
├── turbo.json
└── package.json
```

SDK from day one — contract for all applications, ready for publication to third-party developers.

---

## 9. First Applications

### Holiday Lottery
- Mechanics: randomness, asynchronicity
- Themed variants: New Year's, Christmas, etc.

### Quiz "Who's First?"
- Mechanics: reaction speed, real-time synchronicity
- Simple tasks, winner determined by response speed

Contrasting mechanics to validate protocol universality.

---

## 10. Development Stages

| Stage | Goal | Features |
|-------|------|----------|
| 1. MVP | First sales | Reusable code from day one |
| 2. Scalable Solution | Growth and opening to third-party developers | Optimization, expansion |

### Launch Strategy
Applications released **before platform** — to accelerate first sales.

Order:
1. SDK + headless core (minimal backend in Docker)
2. Applications in standalone mode
3. Full platform with UI

---

## 11. Product Line

| Product | Description | Model |
|---------|-------------|-------|
| Headless API | Cloud service for developers | Subscription |
| Applications | Ready solutions (lottery, quiz) | Various |
| Platform | Full UI on top of headless | Freemium |

Headless core is considered as a separate product (BaaS for event applications).

---

## 12. Development Prospects

### Application Marketplace
Platform architecture doesn't exclude evolution into a marketplace — catalog of applications from third-party developers. Key elements are already in place:
- Application manifest with capabilities and permissions declaration
- SDK as contract for external developers
- Function delegation levels (open/protected)

Marketplace monetization model decisions (commissions, categories, certification) — at scaling stage.

---

## 13. Open Questions

- [x] Detailed WebSocket events protocol — **COMPLETED** (see `docs/api/websocket-protocol.md`)
- [x] REST API endpoints structure — **COMPLETED** (see `docs/api/rest-endpoints.md` and `docs/openapi.yaml`)
- [ ] Database schema (Prisma schema)
- [ ] Platform UI design
- [ ] Pricing for applications and headless API

**API Design Decision:** Dual authentication model (app key + user context) selected for application authentication. See `docs/api/design-decisions.md` for rationale.

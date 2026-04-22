# Backend Architecture — AI Test Case Generator

## 1. System Overview

The AI Test Case Generator is a modular monolith backend application built with NestJS (Node.js/TypeScript), deployed on-premises on VM-based infrastructure. It integrates with Jira Cloud to ingest requirements, uses a dual-LLM strategy (OpenAI GPT-4o for test case generation, Groq for requirement parsing) to produce hierarchical, step-level test cases, and exposes a RESTful API consumed by a React SPA frontend. The system follows a semi-automatic workflow with two human-in-the-loop approval gates — pre-generation and post-generation — ensuring budget control and quality assurance. Architecture is designed as a modular monolith with clear module boundaries, extensible to microservices, and forward-compatible with Stage 2 (pipeline integration, RAG with MongoDB) and Stage 3 (deep evaluation framework).

### Architecture Style

**Modular Monolith** — single deployable unit with logically separated modules communicating through well-defined internal interfaces. Each module can be extracted into an independent microservice when scaling demands it.

### Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Runtime | Node.js 20 LTS | Long-term support, team expertise |
| Framework | NestJS 10+ | Enterprise-grade, modular, TypeScript-native, dependency injection |
| Language | TypeScript 5.x (strict mode) | Type safety, shared language with frontend |
| Primary Database | PostgreSQL 16 | Relational integrity, JSONB for flexible fields, ACID compliance, self-hostable |
| Cache & Queue | Redis 7 | BullMQ job queue, LLM response caching, session store, webhook event buffer |
| Future Document Store | MongoDB (Stage 2/3) | Vector store for RAG, document embeddings, test case corpus |
| Job Queue | BullMQ | Redis-backed, priority queues, retries, progress tracking, concurrency control |
| Real-Time | WebSocket (Socket.IO) | Generation progress updates, in-app notifications |
| LLM — Generation | OpenAI GPT-4o | High-quality structured test case output, function calling, JSON mode |
| LLM — Parsing | Groq (Llama/Mixtral) | Fast, low-cost requirement field extraction |
| LLM — Chatbot | OpenAI + Atlassian MCP | Hybrid Q&A + Co-Pilot, conversational Jira queries via MCP |
| Observability | OpenTelemetry + Pino | Distributed tracing, structured logging, Prometheus-format metrics |
| Authentication | JWT (access + refresh tokens) | Stateless auth, bcrypt password hashing |
| Encryption | AES-256 | Jira API token encryption at rest |
| Package Manager | pnpm | Fast, disk-efficient, strict dependency resolution |

---

## 2. Service Architecture

### Module Structure

The application is organized into the following NestJS modules. Each module encapsulates its own controllers, services, repositories, and DTOs.

```
src/
├── app.module.ts                  # Root module — imports all feature modules
├── common/                        # Shared utilities, guards, interceptors, filters
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── tracing.interceptor.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   └── interfaces/
│       ├── llm-provider.interface.ts
│       ├── export-adapter.interface.ts
│       ├── notification-channel.interface.ts
│       └── mcp-provider.interface.ts
│
├── auth/                          # Authentication & authorization module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts       # Future: SSO strategy plugs in here
│   └── dto/
│
├── users/                         # User management module
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── dto/
│
├── jira/                          # Jira integration module
│   ├── jira.controller.ts
│   ├── jira.service.ts
│   ├── jira-poller.service.ts      # Scheduled polling job
│   ├── jira-webhook.controller.ts  # Future: webhook receiver
│   ├── jira-dedup.service.ts       # Deduplication for hybrid mode
│   ├── entities/
│   │   └── jira-ticket.entity.ts
│   └── dto/
│
├── parser/                        # Requirement parsing module (Groq LLM)
│   ├── parser.service.ts
│   ├── parser-prompt.template.ts
│   └── dto/
│       └── parsed-requirement.dto.ts
│
├── generator/                     # Test case generation module (OpenAI LLM)
│   ├── generator.controller.ts
│   ├── generator.service.ts
│   ├── generator-prompt.template.ts
│   ├── generator-worker.processor.ts  # BullMQ worker
│   ├── entities/
│   │   ├── test-case.entity.ts
│   │   └── test-step.entity.ts
│   └── dto/
│
├── llm/                           # LLM abstraction layer
│   ├── llm.module.ts
│   ├── llm.service.ts             # Unified interface
│   ├── providers/
│   │   ├── openai.provider.ts
│   │   ├── groq.provider.ts
│   │   └── base-llm.provider.ts   # Future: on-prem model provider
│   ├── token-tracker.service.ts
│   └── budget-manager.service.ts
│
├── chatbot/                       # Chatbot module (Hybrid Q&A + Co-Pilot)
│   ├── chatbot.controller.ts
│   ├── chatbot.service.ts
│   ├── chatbot.gateway.ts         # WebSocket gateway for real-time chat
│   ├── intent-detector.service.ts
│   ├── mcp/
│   │   ├── mcp-registry.service.ts
│   │   ├── atlassian-mcp.adapter.ts
│   │   └── base-mcp.adapter.ts    # Future: Slack, Confluence MCP adapters
│   └── dto/
│
├── export/                        # Export module
│   ├── export.controller.ts
│   ├── export.service.ts
│   ├── adapters/
│   │   ├── csv-export.adapter.ts
│   │   ├── json-export.adapter.ts
│   │   ├── excel-export.adapter.ts
│   │   └── base-export.adapter.ts  # Future: XRAY, TestRail, Zephyr adapters
│   └── entities/
│       └── export-history.entity.ts
│
├── notifications/                 # Notification module
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.gateway.ts   # WebSocket for real-time notifications
│   ├── channels/
│   │   ├── in-app.channel.ts
│   │   └── base-notification.channel.ts  # Future: email, Slack channels
│   └── entities/
│       └── notification.entity.ts
│
├── audit/                         # Audit log module
│   ├── audit.service.ts
│   ├── audit.interceptor.ts       # Auto-captures actions via NestJS interceptor
│   └── entities/
│       └── audit-log.entity.ts
│
├── dashboard/                     # Dashboard & analytics module
│   ├── dashboard.controller.ts
│   └── dashboard.service.ts
│
├── health/                        # Health check module
│   ├── health.controller.ts
│   └── health.service.ts
│
└── config/                        # Configuration module
    ├── config.module.ts
    ├── database.config.ts
    ├── redis.config.ts
    ├── jwt.config.ts
    ├── jira.config.ts
    ├── llm.config.ts
    └── budget.config.ts
```

### Module Dependency Map

```
                        ┌─────────────────┐
                        │    app.module    │
                        └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   ┌────▼────┐            ┌──────▼──────┐          ┌──────▼──────┐
   │  auth   │            │    jira     │          │  chatbot    │
   └────┬────┘            └──────┬──────┘          └──────┬──────┘
        │                        │                        │
   ┌────▼────┐            ┌──────▼──────┐          ┌──────▼──────┐
   │  users  │            │   parser    │          │  mcp-registry│
   └─────────┘            └──────┬──────┘          └─────────────┘
                                 │
                          ┌──────▼──────┐
                          │  generator  │
                          └──────┬──────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
       │     llm     │   │   export    │   │notifications│
       └──────┬──────┘   └─────────────┘   └─────────────┘
              │
       ┌──────▼──────┐
       │budget-manager│
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │token-tracker │
       └─────────────┘

   Cross-cutting: audit, health, config, dashboard (depend on multiple modules)
```

### Stage Mapping

| Module | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| auth, users, config, health | ✅ Full | Maintained | Maintained |
| jira (polling) | ✅ Full | + Webhooks | Maintained |
| parser | ✅ Full | + Batch parsing | + RAG-enhanced parsing |
| generator | ✅ Sequential | + Parallel/Batch | + Quality scoring |
| llm (OpenAI + Groq) | ✅ Full | + On-prem model adapter | + Fine-tuned models |
| chatbot | ✅ Full | + Confluence/Slack MCP | + RAG-powered responses |
| export (CSV/JSON/Excel) | ✅ Full | + XRAY/TestRail/Zephyr | Maintained |
| notifications (in-app) | ✅ Full | + Email/Slack channels | Maintained |
| audit | ✅ Full | Maintained | Maintained |
| dashboard | ✅ Basic metrics | + Advanced analytics | + Quality dashboards |
| pipeline (new) | — | ✅ Data pipeline module | + Evaluation pipeline |
| rag (new) | — | ✅ MongoDB + embeddings | + Feedback loops |

---

## 3. API Design

All endpoints are prefixed with `/api/v1`. Authentication required unless marked [Public].

### 3.1 Authentication Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| POST | `/auth/register` | Register new user | [Public] | — |
| POST | `/auth/login` | Login, returns JWT access + refresh tokens | [Public] | — |
| POST | `/auth/refresh` | Refresh access token using refresh token | [Public] | — |
| POST | `/auth/logout` | Invalidate refresh token | Required | All |
| GET | `/auth/me` | Get current user profile | Required | All |

**POST `/auth/login` — Request:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123"
}
```

**POST `/auth/login` — Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@company.com",
    "name": "John Doe",
    "role": "qa_tester"
  }
}
```

### 3.2 User Management Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| GET | `/users` | List all users (paginated) | Required | Admin |
| GET | `/users/:id` | Get user by ID | Required | Admin |
| POST | `/users` | Create user (admin-created accounts) | Required | Admin |
| PATCH | `/users/:id` | Update user (role, name, status) | Required | Admin |
| DELETE | `/users/:id` | Soft-delete user | Required | Admin |
| PATCH | `/users/:id/jira-token` | Store/update user's encrypted Jira API token | Required | Self, Admin |

### 3.3 Jira Integration Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| GET | `/jira/tickets` | List fetched Jira tickets (paginated, filterable) | Required | All |
| GET | `/jira/tickets/:id` | Get ticket details with parsed fields | Required | All |
| POST | `/jira/sync` | Trigger manual Jira sync for current user's projects | Required | Admin, QA Lead |
| GET | `/jira/projects` | List configured Jira projects | Required | All |
| POST | `/jira/projects` | Add Jira project to monitoring | Required | Admin |
| DELETE | `/jira/projects/:id` | Remove Jira project from monitoring | Required | Admin |
| POST | `/jira/validate-token` | Validate user's Jira API token | Required | All |

**GET `/jira/tickets` — Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "jiraKey": "PROJ-123",
      "summary": "User login with OAuth2",
      "description": "As a user, I want to login...",
      "storyId": "PROJ-123",
      "module": "Authentication",
      "acceptanceCriteria": [
        "User can login with Google OAuth2",
        "Session persists for 24 hours",
        "Invalid credentials show error message"
      ],
      "status": "ready_for_generation",
      "jiraStatus": "In Progress",
      "project": "PROJ",
      "fetchedAt": "2026-04-11T10:30:00Z",
      "parsedAt": "2026-04-11T10:30:05Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 3.4 Generation Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| POST | `/generation/queue` | Approve tickets for generation (single or batch) | Required | QA Lead, QA Tester |
| GET | `/generation/queue` | List generation queue (filterable by status) | Required | All |
| GET | `/generation/queue/:jobId` | Get job status and progress | Required | All |
| POST | `/generation/queue/:jobId/cancel` | Cancel a queued/in-progress job | Required | QA Lead, QA Tester |
| POST | `/generation/queue/:jobId/retry` | Retry a failed job | Required | QA Lead, QA Tester |

**POST `/generation/queue` — Request:**
```json
{
  "ticketIds": ["uuid-1", "uuid-2"],
  "options": {
    "testCaseTypes": ["positive", "negative", "boundary", "edge_case"],
    "priority": "normal"
  }
}
```

**POST `/generation/queue` — Response:**
```json
{
  "jobs": [
    {
      "jobId": "job-uuid-1",
      "ticketId": "uuid-1",
      "ticketKey": "PROJ-123",
      "status": "queued",
      "queuedAt": "2026-04-11T10:35:00Z"
    }
  ]
}
```

### 3.5 Test Case Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| GET | `/test-cases` | List test cases (paginated, filterable by module, type, status, story) | Required | All |
| GET | `/test-cases/:id` | Get test case with all steps | Required | All |
| PATCH | `/test-cases/:id` | Inline edit test case (title, steps, priority, module) | Required | QA Lead, QA Tester |
| POST | `/test-cases/:id/approve` | Approve test case | Required | QA Lead |
| POST | `/test-cases/:id/reject` | Reject test case with reason | Required | QA Lead |
| POST | `/test-cases/:id/regenerate` | Regenerate test case (re-queues LLM call) | Required | QA Lead, QA Tester |
| POST | `/test-cases/bulk-action` | Bulk approve/reject/regenerate | Required | QA Lead |

**GET `/test-cases/:id` — Response:**
```json
{
  "id": "uuid",
  "testCaseId": "TC-PROJ-123-001",
  "title": "Verify successful OAuth2 login with Google",
  "module": "Authentication",
  "type": "positive",
  "priority": "high",
  "status": "pending_review",
  "traceabilityLink": "PROJ-123",
  "tags": ["oauth2", "login", "google"],
  "steps": [
    {
      "stepNumber": 1,
      "action": "Navigate to the login page",
      "inputData": "URL: /login",
      "expectedResult": "Login page loads with Google OAuth2 button visible",
      "precondition": "User is not authenticated"
    },
    {
      "stepNumber": 2,
      "action": "Click the 'Sign in with Google' button",
      "inputData": "Valid Google account credentials",
      "expectedResult": "User is redirected to Google OAuth2 consent screen",
      "precondition": "Login page is loaded"
    },
    {
      "stepNumber": 3,
      "action": "Authorize the application on Google consent screen",
      "inputData": "Click 'Allow' on consent screen",
      "expectedResult": "User is redirected back to the application dashboard with active session",
      "precondition": "Google consent screen is displayed"
    }
  ],
  "generatedAt": "2026-04-11T10:36:30Z",
  "generatedBy": "openai:gpt-4o",
  "tokensUsed": {
    "input": 850,
    "output": 1200,
    "cost": 0.0145
  }
}
```

### 3.6 Export Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| POST | `/exports` | Trigger export (CSV, JSON, Excel) | Required | QA Lead, QA Tester |
| GET | `/exports` | List export history | Required | QA Lead, QA Tester |
| GET | `/exports/:id/download` | Download export file | Required | QA Lead, QA Tester |

**POST `/exports` — Request:**
```json
{
  "format": "excel",
  "filters": {
    "projectKey": "PROJ",
    "status": "approved",
    "module": "Authentication",
    "types": ["positive", "negative"]
  }
}
```

### 3.7 Notification Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| GET | `/notifications` | List notifications (paginated, filterable) | Required | All |
| PATCH | `/notifications/:id/read` | Mark notification as read | Required | All |
| POST | `/notifications/mark-all-read` | Mark all as read | Required | All |
| GET | `/notifications/unread-count` | Get unread notification count | Required | All |

### 3.8 Chatbot Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| POST | `/chatbot/message` | Send a chat message (REST fallback) | Required | All except Viewer |
| GET | `/chatbot/history` | Get chat history for current user | Required | All except Viewer |
| DELETE | `/chatbot/history` | Clear chat history | Required | All except Viewer |

Real-time chat is handled via WebSocket gateway at `ws://host/chatbot`.

**POST `/chatbot/message` — Request:**
```json
{
  "message": "How many test cases are pending review for PROJ?",
  "context": {
    "currentPage": "test-cases",
    "selectedTestCaseId": null
  }
}
```

**POST `/chatbot/message` — Response:**
```json
{
  "reply": "There are 12 test cases pending review for project PROJ. 5 are positive tests, 4 negative, 2 boundary, and 1 edge case. Would you like me to show the breakdown by module?",
  "intent": "query",
  "sources": ["database"],
  "tokensUsed": {
    "input": 320,
    "output": 85,
    "cost": 0.004
  }
}
```

### 3.9 Dashboard Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| GET | `/dashboard/stats` | Overview stats (tickets, test cases, pending, budget) | Required | All |
| GET | `/dashboard/activity` | Recent activity feed | Required | All |
| GET | `/dashboard/token-usage` | Token usage breakdown (daily, weekly, monthly) | Required | Admin, QA Lead |

### 3.10 Admin / Settings Endpoints

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| GET | `/settings/llm` | Get LLM configuration | Required | Admin |
| PATCH | `/settings/llm` | Update LLM provider settings | Required | Admin |
| GET | `/settings/budget` | Get budget configuration | Required | Admin |
| PATCH | `/settings/budget` | Update budget allocation and thresholds | Required | Admin |
| GET | `/settings/budget/usage` | Get current budget usage | Required | Admin, QA Lead |

**PATCH `/settings/budget` — Request:**
```json
{
  "monthlyBudgetEuro": 25,
  "allocation": {
    "generation": 40,
    "chatbot": 40,
    "parsing": 20
  },
  "perUserDailyLimit": {
    "qa_tester": 1.0,
    "qa_lead": 2.0,
    "admin": 5.0
  },
  "alertThresholds": [50, 80, 95],
  "exhaustionBehavior": "fallback_to_groq"
}
```

### 3.11 Health & Metrics Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/health` | Health check (DB, Redis, LLM providers) | [Public] |
| GET | `/health/ready` | Readiness probe | [Public] |
| GET | `/metrics` | Prometheus-format metrics | [Internal] |

---

## 4. Data Flow

### 4.1 Jira Ticket Ingestion Flow (Polling — Stage 1)

```
Step 1: [Cron Job] JiraPollerService triggers every 2 minutes
        ↓
Step 2: For each configured Jira project:
        → Call Jira Cloud REST API v3 (GET /rest/api/3/search)
        → JQL: "project = PROJ AND updated >= -3m ORDER BY updated DESC"
        → Use the requesting user's encrypted Jira API token (decrypted at call time)
        ↓
Step 3: JiraDeduplicationService checks each ticket against PostgreSQL
        → If new ticket: insert with status "new"
        → If updated ticket: update fields, set status "updated"
        → If already processed and unchanged: skip
        ↓
Step 4: For new/updated tickets, ParserService is invoked:
        → Send ticket summary + description + acceptance criteria to Groq (Llama/Mixtral)
        → Extract structured fields: Story ID, title, module, description, acceptance criteria list, headers
        → Store parsed fields in jira_tickets table, set status "ready_for_generation"
        ↓
Step 5: NotificationService creates in-app notification:
        → "3 new tickets detected in project PROJ — ready for generation"
        → Push via WebSocket to connected users with access to PROJ
```

### 4.2 Test Case Generation Flow

```
Step 1: [User Action] QA Tester/Lead selects tickets in UI → clicks "Generate"
        → POST /api/v1/generation/queue with ticket IDs
        ↓
Step 2: GeneratorService creates BullMQ jobs:
        → One job per ticket
        → Job data: ticket ID, parsed fields, generation options, user ID
        → Job priority: normal (configurable)
        → Set status: "queued"
        ↓
Step 3: GeneratorWorkerProcessor picks up job (sequential — single worker in MVP):
        → BudgetManagerService.checkBudget() — verify sufficient budget
        → If budget exhausted:
           → If exhaustionBehavior === "fallback_to_groq": switch to Groq for generation
           → If exhaustionBehavior === "hard_stop": fail job with "budget_exhausted" error
        ↓
Step 4: LLMService.generate() called via abstraction layer:
        → Build prompt from template + parsed ticket fields
        → Prompt instructs: generate positive, negative, boundary, edge-case test cases
        → Prompt specifies: hierarchical JSON output with step-level detail
        → Send to OpenAI GPT-4o (or fallback provider)
        → Stream progress events via WebSocket:
           → "parsing_complete" → "generating_positive" → "generating_negative"
           → "generating_boundary" → "generating_edge_case" → "formatting"
        ↓
Step 5: Response parsing and validation:
        → Parse LLM JSON response
        → Validate against TestCase schema (Zod validation)
        → If validation fails: retry with corrective prompt (max 2 retries)
        → TokenTrackerService.record() — log tokens used per call
        ↓
Step 6: Store generated test cases:
        → Insert into test_cases table (status: "pending_review")
        → Insert into test_steps table (linked to test case)
        → Update job status: "completed"
        ↓
Step 7: Post-generation notifications:
        → NotificationService: "5 test cases generated for PROJ-123 — pending review"
        → AuditService: log generation action with token usage
        → Push via WebSocket to the requesting user
```

### 4.3 Test Case Review Flow

```
Step 1: [User Action] QA Lead opens Test Cases page → filters by "Pending Review"
        ↓
Step 2: For each test case, user can:
        → APPROVE: status → "approved", audit log entry, notification to QA Tester
        → REJECT (with reason): status → "rejected", audit log with reason, notification
        → EDIT: inline editor opens → modify fields/steps → save → status remains "pending_review"
        → REGENERATE: creates new BullMQ job → old test case archived → new generation queued
        ↓
Step 3: AuditService records every action:
        → action_type, user_id, test_case_id, before_snapshot, after_snapshot, timestamp
```

### 4.4 Chatbot Interaction Flow

```
Step 1: [User Action] Types message in chatbot widget or chatbot page
        → Sent via WebSocket (or REST fallback)
        ↓
Step 2: IntentDetectorService classifies intent:
        → "query" — user is asking about data (e.g., "How many test cases for PROJ?")
        → "action" — user wants to modify test cases (e.g., "Add a boundary test for TC-001")
        → "jira_query" — user wants live Jira info (e.g., "What's the status of PROJ-456?")
        ↓
Step 3: Based on intent:
        → "query": ChatbotService queries PostgreSQL → formats response → returns
        → "action": ChatbotService calls GeneratorService or TestCaseService → confirms action → returns
        → "jira_query": MCPRegistryService routes to AtlassianMCPAdapter
            → LLM calls Atlassian MCP tools (Jira search, issue fetch)
            → If MCP unavailable: fallback to locally cached Jira data in PostgreSQL
        ↓
Step 4: BudgetManagerService.checkChatbotBudget() — enforce chatbot-specific token limits
        → TokenTrackerService.record() — log chatbot token usage
        ↓
Step 5: Response returned via WebSocket with metadata:
        → reply text, intent classification, sources used, tokens consumed
```

### 4.5 Export Flow

```
Step 1: [User Action] Clicks "Export" → selects format (CSV/JSON/Excel) + filters
        → POST /api/v1/exports
        ↓
Step 2: ExportService selects adapter based on format:
        → CSVExportAdapter / JSONExportAdapter / ExcelExportAdapter
        → Query test_cases + test_steps with user-specified filters
        → Generate file in /tmp/exports/
        ↓
Step 3: Store export metadata:
        → export_history table: format, filters, file_path, user_id, created_at
        → NotificationService: "Your Excel export is ready for download"
        ↓
Step 4: User downloads via GET /api/v1/exports/:id/download
```

---

## 5. LLM Integration Strategy

### 5.1 Abstraction Layer Design

```typescript
// common/interfaces/llm-provider.interface.ts
interface ILLMProvider {
  name: string;
  generate(prompt: string, options: LLMOptions): Promise<LLMResponse>;
  parse(content: string, schema: ZodSchema): Promise<ParsedResponse>;
  estimateTokens(text: string): number;
  getModelInfo(): ModelInfo;
  healthCheck(): Promise<boolean>;
}

interface LLMOptions {
  model: string;
  maxTokens: number;
  temperature: number;
  responseFormat?: 'json' | 'text';
  systemPrompt: string;
  retryCount?: number;
  timeoutMs?: number;
}

interface LLMResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number; };
  model: string;
  latencyMs: number;
  provider: string;
}
```

### 5.2 Provider Configuration

| Provider | Model | Use Case | Temperature | Max Tokens | Timeout |
|---|---|---|---|---|---|
| OpenAI | GPT-4o | Test case generation | 0.3 | 4096 | 60s |
| OpenAI | GPT-4o | Chatbot (action intent) | 0.5 | 2048 | 30s |
| Groq | Llama-3.1-70B | Requirement parsing | 0.1 | 1024 | 15s |
| Groq | Llama-3.1-70B | Chatbot (query intent) | 0.3 | 1024 | 15s |
| Groq | Mixtral-8x7B | Fallback generation (budget exhausted) | 0.3 | 4096 | 30s |

### 5.3 Prompt Design Approach

**Requirement Parsing Prompt (Groq):**
```
System: You are a requirement parser. Extract structured fields from the Jira ticket.
Return ONLY valid JSON matching the provided schema. No explanations.

Schema:
{
  "storyId": "string",
  "title": "string",
  "module": "string",
  "description": "string",
  "acceptanceCriteria": ["string"],
  "headers": ["string"]
}

User: [Raw Jira ticket content]
```

**Test Case Generation Prompt (OpenAI GPT-4o):**
```
System: You are a senior QA engineer generating comprehensive test cases.
Generate test cases for ALL four types: positive, negative, boundary, edge_case.
Ensure maximum test coverage across all acceptance criteria.
Return ONLY valid JSON matching the provided schema.

Schema:
{
  "testCases": [
    {
      "title": "string",
      "module": "string",
      "type": "positive | negative | boundary | edge_case",
      "priority": "high | medium | low",
      "tags": ["string"],
      "steps": [
        {
          "stepNumber": "number",
          "action": "string",
          "inputData": "string",
          "expectedResult": "string",
          "precondition": "string"
        }
      ]
    }
  ],
  "coverageSummary": {
    "positive": "number",
    "negative": "number",
    "boundary": "number",
    "edgeCase": "number",
    "acceptanceCriteriaMapping": {}
  }
}

User:
Story ID: {storyId}
Title: {title}
Module: {module}
Description: {description}
Acceptance Criteria:
{acceptanceCriteria}
```

### 5.4 Token Management & Cost Control

| Strategy | Implementation |
|---|---|
| **Redis response caching** | Cache LLM responses keyed by hash(ticket_content + generation_options). TTL: 24 hours. Cache hit skips LLM call entirely. |
| **Prompt optimization** | Concise system prompts. No few-shot examples in every call (baked into system prompt). Strip unnecessary whitespace. |
| **Token estimation** | Pre-estimate tokens using `tiktoken` (OpenAI) before sending. Reject requests that would exceed remaining budget. |
| **Budget tracking** | Every LLM call logged in `token_usage` table: provider, model, input/output tokens, calculated cost, user, timestamp. |
| **Budget alerts** | Real-time checks against configurable thresholds (50%, 80%, 95%). In-app notifications to Admin at each threshold. |
| **Exhaustion behavior** | Admin-configurable: hard stop (disable feature) or soft limit (fallback to Groq for generation). |
| **Per-user limits** | Daily token cap per user role. Prevents single user from exhausting the budget. |

### 5.5 Retry, Timeout, and Fallback Logic

```
LLM Call Flow:
  1. Check budget → insufficient? → fallback or reject
  2. Estimate tokens → exceeds limit? → reject with error
  3. Call primary provider (timeout: configured per provider)
     → Success? → validate response → return
     → Timeout/Error? → retry (max 2 retries, exponential backoff: 1s, 3s)
     → All retries failed? → try fallback provider
     → Fallback failed? → mark job as "failed", notify user
  4. Log token usage regardless of success/failure (failed calls may still consume tokens)
```

### 5.6 Output Parsing and Validation

All LLM outputs are validated using **Zod schemas** before storage:

```typescript
const TestCaseSchema = z.object({
  title: z.string().min(10),
  module: z.string().min(1),
  type: z.enum(['positive', 'negative', 'boundary', 'edge_case']),
  priority: z.enum(['high', 'medium', 'low']),
  tags: z.array(z.string()),
  steps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    action: z.string().min(5),
    inputData: z.string(),
    expectedResult: z.string().min(5),
    precondition: z.string()
  })).min(1)
});
```

If validation fails, a corrective prompt is sent:
```
The previous response did not match the required schema.
Errors: {validationErrors}
Please regenerate following the exact schema provided.
```

---

## 6. Data Model & Storage

### 6.1 Entity-Relationship Model

```
users
├── id (UUID, PK)
├── email (UNIQUE)
├── password_hash
├── name
├── role (ENUM: admin, qa_lead, qa_tester, viewer)
├── jira_api_token_encrypted
├── is_active (BOOLEAN)
├── created_at
└── updated_at

jira_projects
├── id (UUID, PK)
├── project_key (UNIQUE)
├── project_name
├── jira_url
├── polling_enabled (BOOLEAN)
├── created_by → users.id
├── created_at
└── updated_at

jira_tickets
├── id (UUID, PK)
├── jira_key (UNIQUE, e.g., "PROJ-123")
├── jira_id (Jira's internal ID)
├── project_id → jira_projects.id
├── summary
├── description (TEXT)
├── jira_status
├── raw_content (JSONB — full Jira API response)
├── parsed_fields (JSONB — extracted structured data)
├── module
├── acceptance_criteria (JSONB — array of strings)
├── status (ENUM: new, updated, parsing, ready_for_generation, generation_queued, generating, completed, skipped)
├── fetched_at
├── parsed_at
├── fetched_by → users.id
├── created_at
└── updated_at

test_cases
├── id (UUID, PK)
├── test_case_id (UNIQUE, human-readable, e.g., "TC-PROJ-123-001")
├── ticket_id → jira_tickets.id
├── title
├── module
├── type (ENUM: positive, negative, boundary, edge_case)
├── priority (ENUM: high, medium, low)
├── status (ENUM: pending_review, approved, rejected, archived)
├── tags (JSONB — array of strings)
├── traceability_link (Jira ticket key)
├── generated_by_model
├── generated_by_provider
├── tokens_input
├── tokens_output
├── generation_cost
├── generation_job_id
├── rejection_reason (TEXT, nullable)
├── created_at
├── updated_at
├── approved_at
├── approved_by → users.id
└── created_by → users.id

test_steps
├── id (UUID, PK)
├── test_case_id → test_cases.id
├── step_number (INT)
├── action (TEXT)
├── input_data (TEXT)
├── expected_result (TEXT)
├── precondition (TEXT)
├── created_at
└── updated_at

generation_jobs
├── id (UUID, PK)
├── ticket_id → jira_tickets.id
├── user_id → users.id
├── status (ENUM: queued, processing, completed, failed, cancelled)
├── progress (JSONB — stage info for progress bar)
├── options (JSONB — generation options)
├── error_message (TEXT, nullable)
├── retry_count (INT)
├── started_at
├── completed_at
├── created_at
└── updated_at

token_usage
├── id (UUID, PK)
├── user_id → users.id
├── provider (ENUM: openai, groq)
├── model
├── action_type (ENUM: parsing, generation, chatbot_query, chatbot_action, chatbot_jira)
├── input_tokens (INT)
├── output_tokens (INT)
├── cost_euro (DECIMAL)
├── latency_ms (INT)
├── status (ENUM: success, failed, timeout)
├── related_entity_type (ENUM: ticket, test_case, chat_session)
├── related_entity_id (UUID)
├── created_at
└── (no updated_at — immutable)

notifications
├── id (UUID, PK)
├── user_id → users.id
├── type (ENUM: ticket_detected, generation_complete, generation_failed, approval_needed, budget_alert, export_ready)
├── title
├── message (TEXT)
├── metadata (JSONB — links, counts, context)
├── is_read (BOOLEAN)
├── created_at
└── read_at

audit_logs
├── id (UUID, PK)
├── user_id → users.id
├── user_role
├── action_type (ENUM: login, generate, approve, reject, edit, regenerate, export, config_change, user_create, user_update)
├── entity_type (ENUM: test_case, test_step, jira_ticket, user, settings, export)
├── entity_id (UUID)
├── before_snapshot (JSONB, nullable)
├── after_snapshot (JSONB, nullable)
├── ip_address
├── user_agent
├── created_at
└── (no updated_at — immutable, no deletes)

export_history
├── id (UUID, PK)
├── user_id → users.id
├── format (ENUM: csv, json, excel)
├── filters (JSONB)
├── file_path
├── file_size_bytes (INT)
├── record_count (INT)
├── status (ENUM: processing, completed, failed)
├── created_at
└── completed_at

chat_sessions
├── id (UUID, PK)
├── user_id → users.id
├── messages (JSONB — array of {role, content, intent, timestamp, tokensUsed})
├── created_at
└── updated_at
```

### 6.2 Storage Technology Justification

| Store | Technology | Why |
|---|---|---|
| Primary data | PostgreSQL 16 | Relational integrity for users → tickets → test cases → steps. JSONB for flexible fields (raw Jira content, parsed fields, tags). ACID compliance for audit logs. |
| Cache | Redis 7 | LLM response cache (key: content hash, TTL: 24h). Session store for refresh tokens. BullMQ job queue backing. WebSocket adapter store. |
| Future RAG | MongoDB | Document store for test case corpus embeddings. Vector search for RAG-powered chatbot (Stage 2/3). |

### 6.3 Data Retention and Cleanup Policy

Stage 1 operates without formal retention/backup policies (per user decision). However, the schema supports future retention enforcement:

| Data Type | Stage 1 Behavior | Future Retention Target |
|---|---|---|
| Test cases (approved) | Kept indefinitely | Configurable (1–5 years) |
| Test cases (rejected/archived) | Kept indefinitely | 90 days, then soft delete |
| Audit logs | Kept indefinitely (immutable) | 3–5 years (compliance) |
| Token usage logs | Kept indefinitely | 1 year rolling |
| Chat sessions | Kept indefinitely | 90 days |
| Export files | Kept on disk | 30 days, then auto-delete |
| Redis cache | TTL-based auto-eviction | N/A |

---

## 7. Scalability Plan

### 7.1 Bottleneck Identification

| Bottleneck | Impact | Mitigation |
|---|---|---|
| **LLM API latency** (1–30s per call) | Blocks generation jobs; poor UX if synchronous | Async job queue (BullMQ). User navigates away; notified on completion. |
| **LLM API rate limits** | OpenAI/Groq rate limits may throttle concurrent calls | Sequential processing in MVP. Queue-based rate limiting. Backoff on 429 responses. |
| **PostgreSQL under concurrent reads** | 10–15 concurrent users querying test cases, dashboards | Connection pooling (pg-pool, max 20 connections). Index on frequently queried columns (status, project, module, type). |
| **Redis memory** | Cache growth over time | TTL on all cache keys (24h default). LRU eviction policy. Monitor memory usage via metrics. |
| **Jira API rate limits** | Polling too aggressively may hit Jira Cloud limits (rate limited per user) | 2-minute polling interval. Per-user rate tracking. Backoff on 429. |

### 7.2 Scaling Strategy

| Phase | Strategy | Details |
|---|---|---|
| **MVP (10 users)** | Single NestJS instance + single BullMQ worker | One VM. Vertical scaling if needed (add CPU/RAM). |
| **Growth (15–30 users)** | Multiple BullMQ workers + NestJS clustering | NestJS cluster mode (1 worker per CPU core). BullMQ concurrency: 3–5 parallel jobs. |
| **Scale (30+ users)** | Horizontal scaling | Multiple NestJS instances behind Nginx load balancer. Shared Redis. PostgreSQL read replica. |

### 7.3 Caching Strategy

| Cache Target | Key Pattern | TTL | Eviction |
|---|---|---|---|
| LLM generation responses | `gen:{hash(ticket_content+options)}` | 24 hours | LRU |
| LLM parsing responses | `parse:{hash(ticket_content)}` | 24 hours | LRU |
| Jira ticket data | `jira:{ticketKey}` | 5 minutes | TTL |
| Dashboard stats | `dashboard:{userId}:stats` | 2 minutes | TTL |
| User sessions | `session:{userId}` | 7 days | TTL |
| Budget calculations | `budget:{month}:total` | 5 minutes | TTL |

### 7.4 Queue / Worker Design

```
BullMQ Queue: "generation"
├── Priority: normal (default), high (QA Lead override)
├── Concurrency: 1 (MVP) → 3-5 (post-MVP)
├── Max retries: 2
├── Backoff: exponential (1s, 3s)
├── Job timeout: 120s
├── Stalled job check: every 30s
├── Completed job retention: 24 hours
└── Failed job retention: 7 days

BullMQ Queue: "notifications"
├── Concurrency: 5
├── Max retries: 3
└── Backoff: fixed (1s)

BullMQ Queue: "exports" (future: batch)
├── Concurrency: 2
├── Job timeout: 300s
└── Max retries: 1
```

---

## 8. Security Model

### 8.1 Authentication & Authorization

| Concern | Implementation |
|---|---|
| Password hashing | bcrypt with salt rounds: 12 |
| Access tokens | JWT, HS256, expiry: 15 minutes |
| Refresh tokens | JWT, HS256, expiry: 7 days, stored in PostgreSQL, one active per user |
| Token rotation | New refresh token issued on each refresh call; old one invalidated |
| Brute-force protection | Rate limit on `/auth/login`: 5 attempts per 15 minutes per IP (express-rate-limit) |
| RBAC enforcement | Custom `@Roles()` decorator + `RolesGuard` at controller/method level |

### 8.2 API Key & Secret Management

| Secret | Stage 1 Storage | Future (Vault) |
|---|---|---|
| OpenAI API key | Environment variable | HashiCorp Vault KV v2 |
| Groq API key | Environment variable | HashiCorp Vault KV v2 |
| JWT secret | Environment variable | HashiCorp Vault KV v2 |
| Database password | Environment variable | HashiCorp Vault database secrets engine |
| Redis password | Environment variable | HashiCorp Vault KV v2 |
| AES-256 encryption key (for Jira tokens) | Environment variable | HashiCorp Vault transit secrets engine |

### 8.3 Data Encryption

| Layer | Method |
|---|---|
| In transit | HTTPS/TLS 1.3 on all API endpoints (Nginx terminates TLS) |
| At rest — Jira API tokens | AES-256-GCM encryption in PostgreSQL (application-level encryption) |
| At rest — passwords | bcrypt hashed (irreversible) |
| At rest — database files | Filesystem-level encryption recommended (dm-crypt/LUKS on VM) |
| Redis | `requirepass` enabled; ACL for BullMQ user with limited commands |

### 8.4 Jira Credential Handling

```
Storage:
  → User submits Jira API token via PATCH /api/v1/users/:id/jira-token
  → Token encrypted with AES-256-GCM using server-side key
  → Encrypted token + IV + auth tag stored in users.jira_api_token_encrypted

Usage:
  → When making Jira API calls for a user:
  → Decrypt token in memory (never logged, never cached)
  → Use token in Authorization header: Basic(email:token)
  → Token never appears in logs, error messages, or API responses

Rotation:
  → User can update their token at any time via the Settings page
  → Old token overwritten (not versioned)
  → Validation call to Jira API before storing new token
```

---

## 9. Error Handling & Observability

### 9.1 Logging Strategy

| Concern | Implementation |
|---|---|
| Library | Pino (high-performance, JSON-structured, NestJS native) |
| Format | Structured JSON: `{ timestamp, level, message, correlationId, userId, module, ...context }` |
| Levels | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| Correlation | UUID correlation ID injected at request entry point, propagated through all services and LLM calls |
| Output (Stage 1) | Local rotating files: `/var/log/testgen/app.log` (max 100MB, 7-day retention) |
| Output (Future) | Ship to Grafana Loki via Promtail agent |
| Sensitive data | NEVER log: passwords, JWT tokens, Jira API tokens, full LLM prompts (log prompt template name + token count only) |

### 9.2 Metrics (Prometheus Format)

Exposed at `GET /metrics`:

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status |
| `http_request_duration_seconds` | Histogram | Request latency percentiles |
| `llm_calls_total` | Counter | LLM calls by provider, model, action_type, status |
| `llm_call_duration_seconds` | Histogram | LLM call latency by provider |
| `llm_tokens_total` | Counter | Tokens consumed by provider, model, direction (input/output) |
| `llm_cost_euro_total` | Counter | Cumulative cost by provider |
| `generation_jobs_total` | Counter | Jobs by status (queued, completed, failed) |
| `generation_job_duration_seconds` | Histogram | End-to-end generation time |
| `jira_poll_duration_seconds` | Histogram | Jira polling cycle duration |
| `jira_tickets_fetched_total` | Counter | Tickets fetched by project |
| `active_websocket_connections` | Gauge | Current WebSocket connections |
| `bullmq_queue_size` | Gauge | Current queue depth by queue name |
| `bullmq_queue_failed` | Counter | Failed jobs by queue name |

### 9.3 Distributed Tracing (OpenTelemetry)

```
Trace: Jira Ticket → Test Case Generation
│
├── Span: jira.poll (JiraPollerService)
│   ├── Attributes: project_key, tickets_found, duration
│   └── Span: jira.api_call (HTTP to Jira Cloud)
│       └── Attributes: endpoint, status_code, response_time
│
├── Span: parser.extract (ParserService)
│   └── Span: llm.call (Groq — parsing)
│       └── Attributes: provider, model, input_tokens, output_tokens, cost, latency
│
├── Span: generator.process (GeneratorWorkerProcessor)
│   ├── Span: budget.check (BudgetManagerService)
│   ├── Span: llm.call (OpenAI — generation)
│   │   └── Attributes: provider, model, input_tokens, output_tokens, cost, latency
│   ├── Span: validation.schema (Zod validation)
│   └── Span: database.insert (PostgreSQL — store test cases)
│
└── Span: notification.send (NotificationService)
    └── Attributes: user_id, notification_type, channel
```

### 9.4 Error Classification

| Category | Examples | Behavior |
|---|---|---|
| **Retriable** | LLM timeout, LLM 429 rate limit, Jira API 503, Redis connection error | Auto-retry with exponential backoff (max 2–3 retries). Log as `warn`. |
| **Terminal (user error)** | Invalid Jira token, invalid request body, unauthorized access | Return appropriate HTTP 4xx. Log as `info`. No retry. |
| **Terminal (system error)** | Schema validation failure after retries, budget exhausted, database connection failure | Mark job as `failed`. Notify user. Alert Admin (if critical). Log as `error`. |
| **Fatal** | Database corruption, unrecoverable application crash | Log as `fatal`. Trigger alert. Application restarts via process manager (PM2). |

---

## 10. Stage 2/3 Extension Points

### 10.1 Explicit Interfaces for Future Stages

| Interface | Stage 1 Implementation | Stage 2 Implementation | Stage 3 Implementation |
|---|---|---|---|
| `ILLMProvider` | OpenAI, Groq adapters | + On-prem model adapter (Llama, Mistral) | + Fine-tuned model adapter |
| `IExportAdapter` | CSV, JSON, Excel adapters | + XRAY, TestRail, Zephyr adapters | Maintained |
| `INotificationChannel` | InAppChannel | + EmailChannel, SlackChannel | Maintained |
| `IMCPProvider` | AtlassianMCPAdapter | + ConfluenceMCP, SlackMCP | Maintained |
| `IBackupStrategy` | (stub — not implemented) | PostgreSQL WAL archiving, Redis RDB | + Streaming replication |
| `IEvaluationEngine` | (not present) | (not present) | Quality scoring engine |
| `IPipelineStage` | (not present) | Batch pipeline processor | + Evaluation pipeline |
| `IVectorStore` | (not present) | MongoDB + embeddings | + RAG feedback loops |

### 10.2 What Changes vs. What Stays Stable

| Component | Stage 2 Change | Stays Stable |
|---|---|---|
| **Jira module** | + Webhook controller, dedup service | Poller, entities, DTOs |
| **LLM module** | + On-prem provider adapter | LLMService interface, budget manager, token tracker |
| **Generator module** | + Parallel workers, batch processor | Generator prompt templates, Zod schemas |
| **Export module** | + Test management tool adapters | ExportService, export history |
| **Notification module** | + Email/Slack channel adapters | NotificationService, in-app channel |
| **Chatbot module** | + Confluence/Slack MCP, RAG context | ChatbotService, intent detector |
| **Database** | + MongoDB instance, migration scripts | PostgreSQL schema (additive only — no breaking changes) |
| **Infrastructure** | + Multiple BullMQ workers, Grafana/Prometheus stack | NestJS application, Redis, Nginx |

### 10.3 Backup Upgrade Path

When backup requirements materialize:

| Tier | What to Enable | Estimated Effort |
|---|---|---|
| **Basic** | `pg_dump` cron (daily), Redis RDB snapshots | 2–4 hours |
| **Incremental** | PostgreSQL WAL archiving, point-in-time recovery, automated scripts | 1–2 days |
| **High Availability** | PostgreSQL streaming replication + standby, Redis Sentinel (3 nodes) | 3–5 days |

---

## 11. Deployment Architecture

### 11.1 VM Layout (On-Premises)

```
┌─────────────────────────────────────────────────────────┐
│                    On-Premises VM                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Nginx     │  │  NestJS App  │  │  BullMQ       │  │
│  │  (Reverse   │──│  (Port 3000) │  │  Worker(s)    │  │
│  │   Proxy +   │  │              │  │               │  │
│  │   TLS)      │  │  + Socket.IO │  │               │  │
│  │  :443       │  │              │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐                      │
│  │ PostgreSQL  │  │    Redis     │                      │
│  │  :5432      │  │   :6379     │                      │
│  └─────────────┘  └──────────────┘                      │
│                                                         │
│  Process Manager: PM2 (auto-restart, log rotation)      │
│  OS: Ubuntu 22.04 LTS                                   │
└─────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  ┌──────────────┐    ┌──────────────┐
  │  Jira Cloud  │    │ OpenAI API   │
  │  (REST API)  │    │ Groq API     │
  └──────────────┘    └──────────────┘
```

### 11.2 Process Management

| Process | Manager | Instances | Restart Policy |
|---|---|---|---|
| NestJS API server | PM2 | 1 (cluster mode ready) | Auto-restart on crash, max 10 restarts/min |
| BullMQ worker | PM2 | 1 (MVP) → 3–5 (post-MVP) | Auto-restart, stalled job recovery |
| PostgreSQL | systemd | 1 | Auto-restart |
| Redis | systemd | 1 | Auto-restart |
| Nginx | systemd | 1 | Auto-restart |

### 11.3 Environment Configuration

```bash
# .env (Stage 1 — environment variables)
# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://testgen.internal.company.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testgen
DB_USER=testgen_app
DB_PASSWORD=<secure_password>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<secure_password>

# JWT
JWT_SECRET=<256_bit_random_key>
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# Encryption
AES_ENCRYPTION_KEY=<256_bit_random_key>

# LLM Providers
OPENAI_API_KEY=<openai_key>
GROQ_API_KEY=<groq_key>

# Budget
MONTHLY_BUDGET_EURO=25
BUDGET_ALERT_THRESHOLDS=50,80,95
BUDGET_EXHAUSTION_BEHAVIOR=fallback_to_groq

# Jira
JIRA_POLL_INTERVAL_MS=120000
JIRA_BASE_URL=https://your-org.atlassian.net

# Observability
LOG_LEVEL=info
OTEL_EXPORTER_TYPE=console
OTEL_SERVICE_NAME=testgen-backend
```

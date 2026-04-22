# Frontend Architecture — AI Test Case Generator

## 1. UI Architecture Overview

### Framework & Rendering Strategy

**React 18+ with Vite** — pure Single Page Application (SPA) with client-side rendering. No server-side rendering for Stage 1. Architecture uses React Router v6 for routing, keeping the codebase structured so Next.js migration is feasible if SSR is needed in the future.

### Technology Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Framework | React | 18+ | Team expertise, largest ecosystem, component-based architecture |
| Build Tool | Vite | 5+ | Fast HMR, native ESM, optimized production builds, TypeScript-first |
| Language | TypeScript | 5.x (strict) | Type safety, shared types with NestJS backend |
| Routing | React Router | v6 | Nested routes, lazy loading, route guards |
| Styling | Tailwind CSS | 3+ | Utility-first, dark mode support via `dark:` variant, small bundle |
| Component Library | Shadcn/ui | Latest | Free, customizable, copy-paste components, Tailwind-native |
| Data Tables | TanStack Table | v8 | Headless, sorting, filtering, pagination, column resizing |
| Server State | TanStack Query | v5 | Caching, background refetch, optimistic updates, devtools |
| Client State | React Context | Built-in | Theme, user session, sidebar state — minimal client state |
| Rich Text Editor | Tiptap | v2 | Free core, inline editing for test case steps |
| Notifications (Toast) | Sonner | Latest | Lightweight, accessible, customizable toasts |
| WebSocket | Socket.IO Client | v4 | Real-time generation progress, in-app notifications |
| Icons | Lucide React | Latest | Consistent icon set, tree-shakeable |
| Charts | Recharts | Latest | Dashboard metrics, token usage visualization |
| HTTP Client | Axios | Latest | Interceptors for JWT refresh, request/response typing |
| Form Handling | React Hook Form + Zod | Latest | Performant forms, Zod schema validation shared with backend |
| Date Handling | date-fns | Latest | Lightweight, tree-shakeable date formatting |
| Export | Built-in (backend-driven) | — | Frontend triggers export; backend generates file |
| Package Manager | pnpm | Latest | Fast, disk-efficient, consistent with backend |

### Folder / Module Structure

```
src/
├── main.tsx                          # Application entry point
├── App.tsx                           # Root component — providers, router
├── index.css                         # Tailwind imports, CSS custom properties
│
├── assets/                           # Static assets (logos, images)
│   └── logo.svg
│
├── config/
│   ├── api.config.ts                 # API base URL, timeout, endpoints map
│   ├── routes.config.ts              # Route path constants
│   ├── query-keys.config.ts          # TanStack Query key factory
│   └── constants.ts                  # App-wide constants (roles, statuses, etc.)
│
├── providers/
│   ├── AuthProvider.tsx              # Authentication context + JWT management
│   ├── ThemeProvider.tsx             # Dark/light theme context
│   ├── SocketProvider.tsx            # Socket.IO connection context
│   └── NotificationProvider.tsx      # In-app notification state
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.ts                    # Auth context consumer
│   ├── useTheme.ts                   # Theme toggle hook
│   ├── useSocket.ts                  # WebSocket connection hook
│   ├── useNotifications.ts           # Notification subscription hook
│   ├── useDebounce.ts               # Input debouncing
│   └── useMediaQuery.ts             # Responsive breakpoint detection
│
├── services/                         # API service layer
│   ├── api.client.ts                 # Axios instance with interceptors
│   ├── auth.service.ts               # Login, register, refresh, logout
│   ├── users.service.ts              # User CRUD
│   ├── jira.service.ts               # Jira tickets, projects, sync
│   ├── generation.service.ts         # Generation queue operations
│   ├── test-cases.service.ts         # Test case CRUD, approve, reject
│   ├── export.service.ts             # Export triggers, download
│   ├── notifications.service.ts      # Notification CRUD
│   ├── chatbot.service.ts            # Chat message send/receive
│   ├── dashboard.service.ts          # Dashboard stats, activity
│   └── settings.service.ts           # LLM config, budget config
│
├── queries/                          # TanStack Query hooks (server state)
│   ├── useJiraTickets.ts
│   ├── useTestCases.ts
│   ├── useGenerationQueue.ts
│   ├── useNotificationsQuery.ts
│   ├── useDashboardStats.ts
│   ├── useExportHistory.ts
│   ├── useUsers.ts
│   └── useBudget.ts
│
├── mutations/                        # TanStack Query mutations
│   ├── useGenerateMutation.ts
│   ├── useApproveTestCase.ts
│   ├── useRejectTestCase.ts
│   ├── useEditTestCase.ts
│   ├── useRegenerateTestCase.ts
│   ├── useExportMutation.ts
│   └── useChatSendMessage.ts
│
├── components/                       # Shared / reusable components
│   ├── ui/                           # Shadcn/ui primitives (Button, Input, Dialog, etc.)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── tooltip.tsx
│   │   ├── skeleton.tsx
│   │   ├── tabs.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   └── ...
│   │
│   ├── layout/                       # Layout components
│   │   ├── AppLayout.tsx             # Main layout — sidebar + top bar + content
│   │   ├── Sidebar.tsx               # Collapsible navigation sidebar
│   │   ├── TopBar.tsx                # Top bar — profile, notifications, theme, search
│   │   ├── MobileNav.tsx             # Hamburger menu for mobile
│   │   └── PageContainer.tsx         # Consistent page padding and max-width
│   │
│   ├── shared/                       # Shared business components
│   │   ├── DataTable.tsx             # Generic TanStack Table wrapper
│   │   ├── StatusBadge.tsx           # Colored status badges
│   │   ├── PriorityBadge.tsx         # Priority indicator
│   │   ├── TypeBadge.tsx             # Test case type badge (positive, negative, etc.)
│   │   ├── LoadingSpinner.tsx        # Loading states
│   │   ├── EmptyState.tsx            # Empty data placeholders
│   │   ├── ErrorBoundary.tsx         # Error boundary with fallback UI
│   │   ├── ConfirmDialog.tsx         # Reusable confirmation modal
│   │   ├── SearchInput.tsx           # Global search with debounce
│   │   └── ProtectedRoute.tsx        # Role-based route guard
│   │
│   └── chatbot/                      # Chatbot widget components
│       ├── ChatbotWidget.tsx         # Floating bottom-right widget
│       ├── ChatbotPage.tsx           # Full-page chatbot view
│       ├── ChatMessage.tsx           # Individual message bubble
│       ├── ChatInput.tsx             # Message input with send button
│       └── SuggestedPrompts.tsx      # Quick-start prompt chips
│
├── pages/                            # Page-level components (one per route)
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   │
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── StatsCards.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── TokenUsageChart.tsx
│   │
│   ├── jira-tickets/
│   │   ├── JiraTicketsPage.tsx
│   │   ├── TicketTable.tsx
│   │   ├── TicketDetailDrawer.tsx
│   │   ├── TicketFilters.tsx
│   │   └── GenerateButton.tsx
│   │
│   ├── generation-queue/
│   │   ├── GenerationQueuePage.tsx
│   │   ├── QueueTable.tsx
│   │   ├── QueueStatusColumn.tsx
│   │   └── ProgressIndicator.tsx
│   │
│   ├── test-cases/
│   │   ├── TestCasesPage.tsx
│   │   ├── TestCaseTable.tsx
│   │   ├── TestCaseDetailPanel.tsx
│   │   ├── TestCaseEditor.tsx         # Tiptap-powered inline editor
│   │   ├── TestStepList.tsx
│   │   ├── TestCaseFilters.tsx
│   │   ├── BulkActionBar.tsx
│   │   └── ApprovalButtons.tsx
│   │
│   ├── exports/
│   │   ├── ExportsPage.tsx
│   │   ├── ExportWizard.tsx
│   │   └── ExportHistoryTable.tsx
│   │
│   ├── notifications/
│   │   ├── NotificationsPage.tsx
│   │   └── NotificationList.tsx
│   │
│   ├── chatbot/
│   │   └── ChatbotFullPage.tsx
│   │
│   └── admin/
│       ├── AdminPage.tsx
│       ├── UserManagement.tsx
│       ├── JiraSettings.tsx
│       ├── LLMSettings.tsx
│       └── BudgetSettings.tsx
│
├── types/                            # TypeScript type definitions
│   ├── user.types.ts
│   ├── jira.types.ts
│   ├── test-case.types.ts
│   ├── generation.types.ts
│   ├── notification.types.ts
│   ├── chatbot.types.ts
│   ├── export.types.ts
│   ├── dashboard.types.ts
│   └── api.types.ts                  # Generic API response/error types
│
├── utils/                            # Utility functions
│   ├── format-date.ts
│   ├── format-currency.ts
│   ├── role-permissions.ts           # Role-based permission checks
│   ├── token-calculator.ts           # Token cost display formatting
│   └── cn.ts                         # Tailwind class merge utility
│
└── __tests__/                        # Test files (mirrors src structure)
    ├── components/
    ├── hooks/
    ├── pages/
    └── utils/
```

---

## 2. Component Hierarchy

### 2.1 Application Shell

```
<App>
├── <AuthProvider>
│   ├── <ThemeProvider>
│   │   ├── <QueryClientProvider>          # TanStack Query
│   │   │   ├── <SocketProvider>           # Socket.IO connection
│   │   │   │   ├── <NotificationProvider>
│   │   │   │   │   ├── <BrowserRouter>
│   │   │   │   │   │   ├── <Routes>
│   │   │   │   │   │   │   ├── /login → <LoginPage />
│   │   │   │   │   │   │   ├── /register → <RegisterPage />
│   │   │   │   │   │   │   └── /* → <ProtectedRoute>
│   │   │   │   │   │   │       └── <AppLayout>
│   │   │   │   │   │   │           ├── <TopBar />
│   │   │   │   │   │   │           ├── <Sidebar />
│   │   │   │   │   │   │           ├── <PageContainer>
│   │   │   │   │   │   │           │   └── [Active Page Component]
│   │   │   │   │   │   │           └── <ChatbotWidget />    # Floating widget
│   │   │   │   │   │   │
│   │   │   │   │   │   └── <Toaster />                      # Sonner toasts
│   │   │   │   │   └── <ReactQueryDevtools />               # Dev only
```

### 2.2 Page Component Hierarchy

#### Dashboard Page
```
<DashboardPage>
├── <StatsCards>
│   ├── <Card> Tickets Fetched (total, this week)
│   ├── <Card> Test Cases Generated (total, pending review)
│   ├── <Card> Approval Rate (approved vs rejected)
│   └── <Card> Budget Usage (€ spent / €25 limit, percentage bar)
├── <TokenUsageChart>                   # Recharts — daily token spend (line/bar)
└── <ActivityFeed>
    └── <ActivityItem /> × N            # Recent actions with timestamp, user, action type
```

#### Jira Tickets Page
```
<JiraTicketsPage>
├── <TicketFilters>
│   ├── <SearchInput />                 # Search by ticket key or summary
│   ├── <Select> Project filter
│   ├── <Select> Status filter
│   └── <DateRangePicker />
├── <DataTable>                         # TanStack Table
│   ├── Columns: Checkbox, Jira Key, Summary, Module, Status, Fetched At, Actions
│   └── <TicketDetailDrawer>            # Slide-over panel on row click
│       ├── Ticket details (story ID, description, acceptance criteria)
│       ├── Parsed fields display
│       └── <GenerateButton />          # "Generate Test Cases" action
└── <BulkActionBar>                     # Appears when rows selected
    └── <Button> Generate Selected
```

#### Generation Queue Page
```
<GenerationQueuePage>
├── <Tabs>
│   ├── Tab: Pending Approval
│   ├── Tab: In Progress
│   ├── Tab: Completed
│   └── Tab: Failed
├── <QueueTable>                        # TanStack Table per tab
│   ├── Columns: Ticket Key, Summary, Status, Progress, Queued At, Actions
│   └── <ProgressIndicator>             # Animated progress bar with stage labels
│       └── Stages: Parsing → Positive → Negative → Boundary → Edge Case → Complete
└── <BulkActionBar>
    ├── <Button> Approve Selected       # Pre-generation approval
    └── <Button> Skip Selected
```

#### Test Cases Page
```
<TestCasesPage>
├── <TestCaseFilters>
│   ├── <SearchInput />
│   ├── <Select> Module filter
│   ├── <Select> Type filter (positive, negative, boundary, edge_case)
│   ├── <Select> Status filter (pending_review, approved, rejected)
│   ├── <Select> Priority filter
│   └── <Select> Project filter
├── <DataTable>                         # Master list
│   ├── Columns: Checkbox, TC ID, Title, Module, Type, Priority, Status, Story, Actions
│   └── Row click → opens <TestCaseDetailPanel>
├── <TestCaseDetailPanel>               # Side panel or expanded row
│   ├── Test case header (ID, title, module, type, priority, tags)
│   ├── <StatusBadge /> <PriorityBadge /> <TypeBadge />
│   ├── Traceability link → Jira ticket
│   ├── <TestStepList>
│   │   └── <TestStepRow> × N          # Step number, action, input, expected, precondition
│   ├── Token usage summary (input, output, cost)
│   ├── <TestCaseEditor>                # Tiptap inline editor (opens on "Edit" click)
│   │   ├── Editable: title, module, priority, tags
│   │   └── Editable: steps (add, remove, reorder, edit fields)
│   └── <ApprovalButtons>
│       ├── <Button variant="success"> Approve
│       ├── <Button variant="destructive"> Reject (opens reason dialog)
│       └── <Button variant="outline"> Regenerate
└── <BulkActionBar>
    ├── <Button> Bulk Approve
    ├── <Button> Bulk Reject
    └── <Button> Bulk Regenerate
```

#### Exports Page
```
<ExportsPage>
├── <ExportWizard>
│   ├── Step 1: Select format (CSV, JSON, Excel)
│   ├── Step 2: Apply filters (project, module, status, type)
│   ├── Step 3: Preview count ("142 test cases match your filters")
│   └── Step 4: <Button> Export
└── <ExportHistoryTable>
    └── Columns: Format, Filters Summary, Records, File Size, Created At, Download
```

#### Notifications Page
```
<NotificationsPage>
├── <NotificationFilters>
│   ├── <Tabs> All | Unread
│   └── <Select> Type filter
├── <NotificationList>
│   └── <NotificationItem> × N
│       ├── Icon (by type), Title, Message, Timestamp
│       └── Click → navigates to relevant page
└── <Button> Mark All as Read
```

#### Chatbot Page (Full Page)
```
<ChatbotFullPage>
├── <ChatHistory>
│   └── <ChatMessage> × N
│       ├── User message (right-aligned)
│       └── Bot response (left-aligned, with source badges, token cost)
├── <SuggestedPrompts>
│   └── Chips: "Pending reviews for PROJ", "Generate edge cases for...", "Budget status"
└── <ChatInput>
    ├── <Textarea> with auto-resize
    └── <Button> Send (+ keyboard shortcut: Enter)
```

#### Admin / Settings Page
```
<AdminPage>
├── <Tabs>
│   ├── Tab: User Management
│   │   └── <UserManagement>
│   │       ├── <DataTable> — users list (name, email, role, status, actions)
│   │       ├── <Button> Add User → <Dialog> create user form
│   │       └── Row actions: Edit role, Deactivate
│   │
│   ├── Tab: Jira Configuration
│   │   └── <JiraSettings>
│   │       ├── Connected projects list with polling toggle
│   │       ├── <Button> Add Project
│   │       └── API token validation status
│   │
│   ├── Tab: LLM Configuration
│   │   └── <LLMSettings>
│   │       ├── Provider settings (OpenAI key status, Groq key status)
│   │       ├── Model selection per function (generation, parsing, chatbot)
│   │       └── Temperature and token limit controls
│   │
│   └── Tab: Budget
│       └── <BudgetSettings>
│           ├── Monthly budget input (€)
│           ├── Allocation sliders (Generation %, Chatbot %, Parsing %)
│           ├── Per-user daily limit config (by role)
│           ├── Alert threshold config
│           ├── Exhaustion behavior toggle (hard stop / fallback to Groq)
│           └── <TokenUsageChart> — current month breakdown
```

### 2.3 Shared / Reusable Component Library

| Component | Usage | Props |
|---|---|---|
| `<DataTable>` | Every list page (tickets, test cases, queue, exports, users) | columns, data, pagination, sorting, filtering, rowSelection, onRowClick |
| `<StatusBadge>` | Test case status, job status, ticket status | status, size |
| `<PriorityBadge>` | Test case priority display | priority (high/medium/low) |
| `<TypeBadge>` | Test case type display | type (positive/negative/boundary/edge_case) |
| `<LoadingSpinner>` | All async loading states | size, label |
| `<EmptyState>` | No data scenarios | icon, title, description, action |
| `<ErrorBoundary>` | Wraps every page | fallback component |
| `<ConfirmDialog>` | Destructive actions (reject, regenerate, delete) | title, description, onConfirm, variant |
| `<SearchInput>` | Ticket search, test case search, global search | placeholder, onSearch, debounceMs |
| `<ProtectedRoute>` | Route guarding per role | allowedRoles, redirectTo |
| `<PageContainer>` | Consistent page padding | title, description, actions (header buttons) |

---

## 3. State Management

### 3.1 Architecture

The frontend separates state into two categories:

**Server State (TanStack Query)** — all data fetched from the backend API. Cached, background-refreshed, and invalidated automatically.

**Client State (React Context)** — minimal UI-only state that doesn't live on the server.

```
┌─────────────────────────────────────────────┐
│                  React App                   │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │         TanStack Query Cache            │ │
│  │  (Server State — all API data)          │ │
│  │                                         │ │
│  │  jiraTickets, testCases, generationJobs │ │
│  │  notifications, dashboardStats, users   │ │
│  │  budgetUsage, exportHistory, chatHistory│ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ AuthContext │ │ThemeContext │ │SocketCtx │ │
│  │            │ │            │ │          │ │
│  │ user       │ │ theme      │ │ socket   │ │
│  │ token      │ │ toggle()   │ │ connected│ │
│  │ role       │ │            │ │          │ │
│  │ isAuth     │ │            │ │          │ │
│  └────────────┘ └────────────┘ └──────────┘ │
│       (Client State — React Context)         │
└─────────────────────────────────────────────┘
```

### 3.2 TanStack Query Configuration

```typescript
// src/config/query-client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 minutes — data considered fresh
      gcTime: 10 * 60 * 1000,           // 10 minutes — garbage collect unused cache
      refetchOnWindowFocus: true,        // Refresh when user returns to tab
      refetchOnReconnect: true,          // Refresh on network reconnect
      retry: 2,                          // Retry failed requests twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 3.3 Query Key Factory

```typescript
// src/config/query-keys.config.ts
export const queryKeys = {
  jiraTickets: {
    all: ['jira-tickets'] as const,
    list: (filters: TicketFilters) => ['jira-tickets', 'list', filters] as const,
    detail: (id: string) => ['jira-tickets', 'detail', id] as const,
  },
  testCases: {
    all: ['test-cases'] as const,
    list: (filters: TestCaseFilters) => ['test-cases', 'list', filters] as const,
    detail: (id: string) => ['test-cases', 'detail', id] as const,
  },
  generationQueue: {
    all: ['generation-queue'] as const,
    list: (status: string) => ['generation-queue', 'list', status] as const,
    job: (jobId: string) => ['generation-queue', 'job', jobId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    activity: ['dashboard', 'activity'] as const,
    tokenUsage: ['dashboard', 'token-usage'] as const,
  },
  budget: {
    config: ['budget', 'config'] as const,
    usage: ['budget', 'usage'] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  exports: {
    history: ['exports', 'history'] as const,
  },
  chatbot: {
    history: ['chatbot', 'history'] as const,
  },
};
```

### 3.4 Server State vs. Client State Separation

| Data | Category | Managed By | Refresh Strategy |
|---|---|---|---|
| Jira tickets list | Server | TanStack Query | staleTime: 2min, refetchOnWindowFocus |
| Test cases list | Server | TanStack Query | staleTime: 2min, refetchOnWindowFocus |
| Generation job status | Server | TanStack Query + WebSocket | WebSocket pushes invalidate query |
| Notification unread count | Server | TanStack Query + WebSocket | WebSocket pushes update count |
| Dashboard stats | Server | TanStack Query | staleTime: 2min |
| Budget usage | Server | TanStack Query | staleTime: 5min |
| Chat history | Server | TanStack Query | Refetch on new message |
| Current user / JWT | Client | AuthContext | Set on login, cleared on logout |
| Theme preference | Client | ThemeContext | localStorage persisted |
| Sidebar expanded/collapsed | Client | Local useState | Per-session |
| WebSocket connection | Client | SocketContext | Auto-reconnect |
| Active filters (per page) | Client | URL search params (React Router) | URL-persisted, shareable |

### 3.5 Cache Invalidation Strategy

| User Action | Invalidated Queries |
|---|---|
| Approve test case | `testCases.all`, `generationQueue.all`, `dashboard.stats` |
| Reject test case | `testCases.all`, `dashboard.stats` |
| Edit test case | `testCases.detail(id)`, `testCases.all` |
| Trigger generation | `generationQueue.all`, `jiraTickets.all` |
| Generation complete (via WebSocket) | `testCases.all`, `generationQueue.all`, `dashboard.stats`, `budget.usage` |
| New ticket detected (via WebSocket) | `jiraTickets.all`, `dashboard.stats`, `notifications.all` |
| Export completed | `exports.history` |
| Budget config changed | `budget.config`, `budget.usage` |
| Chat message sent | `chatbot.history`, `budget.usage` |

---

## 4. Data Flow & API Integration

### 4.1 Communication Protocol

| Channel | Technology | Use Case |
|---|---|---|
| **REST API** | Axios over HTTPS | All CRUD operations, authentication, exports |
| **WebSocket** | Socket.IO | Generation progress, notification push, chatbot real-time messages |

### 4.2 Axios Client Configuration

```typescript
// src/services/api.client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://testgen.internal.company.com/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401, refresh JWT
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(error.config);
      }
      // Refresh failed — redirect to login
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

### 4.3 Request Lifecycle (Loading, Success, Error)

Every API-connected component follows this pattern:

```typescript
// Example: useTestCases hook
export function useTestCases(filters: TestCaseFilters) {
  return useQuery({
    queryKey: queryKeys.testCases.list(filters),
    queryFn: () => testCasesService.list(filters),
    staleTime: 2 * 60 * 1000,
  });
}

// In component:
function TestCasesPage() {
  const { data, isLoading, isError, error, refetch } = useTestCases(filters);

  if (isLoading) return <LoadingSpinner label="Loading test cases..." />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data?.length) return <EmptyState title="No test cases found" />;

  return <DataTable data={data} columns={columns} />;
}
```

### 4.4 WebSocket Event Flow

```typescript
// src/providers/SocketProvider.tsx
// Socket.IO connection established after login

// Events the frontend LISTENS to:
socket.on('generation:progress', (data: {
  jobId: string;
  stage: 'parsing' | 'generating_positive' | 'generating_negative' |
         'generating_boundary' | 'generating_edge_case' | 'formatting' | 'complete';
  percentage: number;
}) => {
  // Update generation queue UI with progress bar
  queryClient.setQueryData(queryKeys.generationQueue.job(data.jobId), data);
});

socket.on('generation:complete', (data: {
  jobId: string;
  ticketKey: string;
  testCaseCount: number;
}) => {
  // Invalidate relevant queries
  queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.generationQueue.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
  // Show toast notification
  toast.success(`${data.testCaseCount} test cases generated for ${data.ticketKey}`);
});

socket.on('generation:failed', (data: {
  jobId: string;
  ticketKey: string;
  error: string;
}) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.generationQueue.all });
  toast.error(`Generation failed for ${data.ticketKey}: ${data.error}`);
});

socket.on('notification:new', (data: Notification) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
  // Show toast for high-priority notifications
  if (data.type === 'budget_alert') toast.warning(data.message);
});

socket.on('ticket:new', (data: { count: number; project: string }) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.jiraTickets.all });
  toast.info(`${data.count} new tickets detected in ${data.project}`);
});

// Events the frontend EMITS:
socket.emit('chatbot:message', { message: string, context: object });
socket.on('chatbot:response', (data: ChatResponse) => { /* update chat UI */ });
socket.on('chatbot:typing', () => { /* show typing indicator */ });
```

### 4.5 Polling / Real-Time Strategy

| Data | Strategy | Rationale |
|---|---|---|
| Jira ticket list | TanStack Query polling (refetchInterval: 2min) + WebSocket push | Polling as baseline; WebSocket for instant detection notification |
| Generation progress | WebSocket only | Real-time progress bar requires push; no polling needed |
| Notification count | WebSocket push + initial query on mount | Badge must update instantly on new notification |
| Dashboard stats | TanStack Query (refetchOnWindowFocus) | Stats don't need real-time; refresh when user switches back to tab |
| Budget usage | TanStack Query (staleTime: 5min) | Budget changes slowly; 5-minute cache is sufficient |
| Chat messages | WebSocket (bidirectional) | Real-time conversation requires push |

---

## 5. User Roles & Permissions

### 5.1 Role Definitions

| Role | Description | Population |
|---|---|---|
| **Admin** | System configuration, user management, full access | 1–2 per deployment |
| **QA Lead** | Approve/reject test cases, manage generation queue, analytics | 2–3 per team |
| **QA Tester** | Trigger generation, edit test cases, export | 5–10 per team |
| **Viewer** | Read-only access to approved test cases and dashboards | Stakeholders, managers |

### 5.2 Permission Matrix

| Feature / Action | Admin | QA Lead | QA Tester | Viewer |
|---|---|---|---|---|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Jira Tickets | ✅ | ✅ | ✅ | ✅ |
| Trigger Manual Jira Sync | ✅ | ✅ | ❌ | ❌ |
| Approve Tickets for Generation | ✅ | ✅ | ✅ | ❌ |
| View Generation Queue | ✅ | ✅ | ✅ | ✅ |
| View Test Cases | ✅ | ✅ | ✅ | ✅ (approved only) |
| Edit Test Cases | ✅ | ✅ | ✅ | ❌ |
| Approve / Reject Test Cases | ✅ | ✅ | ❌ | ❌ |
| Regenerate Test Cases | ✅ | ✅ | ✅ | ❌ |
| Bulk Actions | ✅ | ✅ | ❌ | ❌ |
| Export Test Cases | ✅ | ✅ | ✅ | ❌ |
| Use Chatbot | ✅ | ✅ | ✅ | ❌ |
| View Notifications | ✅ | ✅ | ✅ | ✅ |
| View Token Usage / Budget | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Configure Jira Projects | ✅ | ❌ | ❌ | ❌ |
| Configure LLM Settings | ✅ | ❌ | ❌ | ❌ |
| Configure Budget | ✅ | ❌ | ❌ | ❌ |

### 5.3 Route Protection

```typescript
// src/components/shared/ProtectedRoute.tsx
// Wraps routes that require specific roles

<Route path="/admin" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminPage />
  </ProtectedRoute>
} />

// Routes hidden from navigation when user lacks permission
// Sidebar dynamically renders links based on user role
```

### 5.4 Conditional Rendering

```typescript
// src/utils/role-permissions.ts
const permissions: Record<UserRole, Set<Permission>> = {
  admin: new Set([...allPermissions]),
  qa_lead: new Set(['view_dashboard', 'view_tickets', 'approve_generation', 'approve_test_cases', ...]),
  qa_tester: new Set(['view_dashboard', 'view_tickets', 'approve_generation', 'edit_test_cases', ...]),
  viewer: new Set(['view_dashboard', 'view_tickets_readonly', 'view_test_cases_approved', ...]),
};

// Hook for components
function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return permissions[user.role].has(permission);
}

// Usage in components
function ApprovalButtons({ testCaseId }) {
  const canApprove = usePermission('approve_test_cases');
  if (!canApprove) return null;

  return (
    <>
      <Button onClick={() => approve(testCaseId)}>Approve</Button>
      <Button onClick={() => reject(testCaseId)} variant="destructive">Reject</Button>
    </>
  );
}
```

---

## 6. UX Design Guidance

### 6.1 Key User Workflows

#### Workflow 1: New Ticket → Generated Test Cases (Primary Happy Path)

```
Step 1: System polls Jira → detects new ticket PROJ-123
        → In-app notification appears in TopBar bell icon
        → Toast: "1 new ticket detected in PROJ"

Step 2: User navigates to Jira Tickets page
        → Sees PROJ-123 with status "Ready for Generation"
        → Clicks row → TicketDetailDrawer opens
        → Reviews summary, description, acceptance criteria

Step 3: User clicks "Generate Test Cases" button
        → Confirmation dialog: "Generate positive, negative, boundary, and edge-case
          test cases for PROJ-123? Estimated cost: ~€0.03"
        → User confirms

Step 4: Redirected to Generation Queue page
        → Job appears with status "In Progress"
        → Progress bar animates: Parsing → Positive → Negative → Boundary → Edge Case
        → User can navigate away — notification will alert on completion

Step 5: Toast notification: "5 test cases generated for PROJ-123"
        → User navigates to Test Cases page
        → Filters by "Pending Review" + "PROJ-123"
        → Reviews each test case (positive, negative, boundary, edge-case types)

Step 6: QA Lead reviews each test case:
        → Opens detail panel → reads steps
        → Edits Step 3 action text (inline editor)
        → Clicks "Approve" → status changes to "Approved"
        → Or: Clicks "Reject" → enters reason → status changes to "Rejected"

Step 7: QA Lead exports approved test cases:
        → Navigates to Exports → selects Excel format
        → Filters: Project=PROJ, Status=Approved
        → Downloads .xlsx file
```

#### Workflow 2: Chatbot Interaction

```
Step 1: User clicks floating chatbot widget (bottom-right)
        → Chat window expands with suggested prompts:
          "Pending reviews for PROJ", "Budget status", "Edge cases for PROJ-123"

Step 2: User types: "How many test cases are pending for PROJ?"
        → Typing indicator shows while bot processes
        → Bot responds: "12 test cases are pending review for PROJ.
          5 positive, 4 negative, 2 boundary, 1 edge case."
        → Source badge: "Database query" | Token cost: €0.004

Step 3: User types: "Add a boundary test case for the login flow in PROJ-123"
        → Bot detects "action" intent
        → Bot responds: "I'll generate a boundary test case for PROJ-123's login flow.
          This will use ~200 tokens (€0.002). Proceed?"
        → User confirms → generation queued → result displayed in chat
```

#### Workflow 3: Budget Alert Response

```
Step 1: System detects 80% budget threshold reached
        → In-app notification (high priority): "LLM budget at 80% (€20/€25)"
        → Toast warning shown to Admin users

Step 2: Admin navigates to Settings → Budget tab
        → Views token usage chart — sees chatbot consuming 60% of budget
        → Adjusts allocation: Generation 50%, Chatbot 30%, Parsing 20%
        → Sets per-user daily limit for QA Testers to €0.50
        → Saves configuration

Step 3: When 95% threshold hit:
        → Notification to all users: "LLM budget nearly exhausted"
        → System auto-switches generation to Groq (fallback behavior)
        → Chatbot continues with reduced model (Groq Llama instead of GPT-4o)
```

### 6.2 Feedback Mechanisms

| Scenario | Feedback Type | Implementation |
|---|---|---|
| API call in progress | Loading spinner + skeleton UI | `<Skeleton>` components from Shadcn/ui; spinners on buttons |
| Generation in progress | Animated progress bar with stage labels | WebSocket-driven, 6 stages, percentage indicator |
| Action success (approve, export, etc.) | Toast notification (bottom-right) | Sonner toast: green for success, auto-dismiss after 4s |
| Action failure | Toast notification (error) + inline error message | Sonner toast: red, persistent until dismissed; inline error on forms |
| Empty state (no data) | Illustrated empty state with action button | `<EmptyState>` component with contextual CTA |
| Budget threshold reached | Banner notification + toast | Yellow warning banner at top of page; persistent until acknowledged |
| Form validation error | Inline field errors + submit button disabled | React Hook Form + Zod; errors shown below each field |
| Chatbot thinking | Typing indicator (animated dots) | Three-dot animation in chat window |
| Jira token invalid | Settings page warning + toast on ticket fetch failure | Red badge on Jira Settings tab; toast on background polling failure |

### 6.3 Accessibility Requirements (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| **Color contrast** | All text meets 4.5:1 ratio (normal text) and 3:1 (large text). Both light and dark themes validated. |
| **Focus indicators** | Visible focus ring on all interactive elements (2px solid, offset 2px). Custom Tailwind `focus-visible:ring-2 ring-offset-2`. |
| **Keyboard navigation** | Full keyboard operability: Tab through all controls, Enter/Space to activate, Escape to close dialogs/drawers, Arrow keys in data tables. |
| **Screen reader** | ARIA labels on all icon buttons, ARIA live regions for toast notifications and generation progress, ARIA roles on navigation landmarks. |
| **Skip navigation** | "Skip to main content" link visible on Tab focus — bypasses sidebar and top bar. |
| **Form accessibility** | Labels associated with inputs via `htmlFor`, error messages linked via `aria-describedby`, required fields marked with `aria-required`. |
| **Dynamic content** | Generation progress updates announced via `aria-live="polite"`. Notification count changes announced via `aria-live="assertive"`. |
| **Motion** | Respect `prefers-reduced-motion` — disable animations for users who request it. |
| **Touch targets** | Minimum 44×44px touch target on all interactive elements (mobile/tablet). |
| **Data table accessibility** | Proper `<table>`, `<thead>`, `<th scope="col">`, `<tbody>` semantics. Sortable columns announced to screen readers. |

### 6.4 Responsive Design Breakpoints

| Breakpoint | Width | Layout Adaptations |
|---|---|---|
| **Desktop** | ≥1280px | Sidebar expanded (240px), multi-column layouts, full data tables, side-by-side detail panels |
| **Laptop** | 1024–1279px | Sidebar expanded (200px), slightly condensed tables, detail panel overlays content |
| **Tablet** | 768–1023px | Sidebar collapsed (icon-only, 64px), single-column detail views, stacked cards, touch-optimized |
| **Mobile** | <768px | Sidebar hidden (hamburger menu), stacked card layouts, simplified tables (key columns only), bottom sheet for detail views, chatbot widget smaller |

---

## 7. Stage 2/3 Extension Points

### 7.1 Frontend Components for Future Stages

| Future Feature | Anticipated Components | Trigger |
|---|---|---|
| **Webhook Configuration UI** (Stage 2) | `<WebhookSettings>` in Admin tab — URL config, event selection, test webhook button | Jira webhook integration |
| **Test Repository Sync** (Stage 2) | `<RepositorySync>` page — connect XRAY/TestRail, view sync status, resolve conflicts | External tool integration |
| **Batch Generation UI** (Stage 2) | `<BatchGenerator>` — select multiple stories, configure batch options, monitor batch progress | Parallel/batch processing |
| **Quality Dashboard** (Stage 3) | `<QualityMetrics>` page — test case quality scores, accuracy trends, LLM comparison charts | Deep evaluation engine |
| **RAG-Powered Chat** (Stage 2/3) | Enhanced `<ChatbotWidget>` — sources include MongoDB corpus, confidence scores shown | RAG with MongoDB |
| **Advanced Analytics** (Stage 2) | `<AnalyticsPage>` — coverage heatmaps, acceptance rate trends, per-module quality scores | Analytics engine |

### 7.2 Feature Flag Strategy

```typescript
// src/config/feature-flags.ts
// Stage 1: Static feature flags (config-driven)
// Future: Replace with a feature flag service (LaunchDarkly, Unleash)

export const featureFlags = {
  // Stage 1 — enabled
  chatbot: true,
  inAppNotifications: true,
  exportCsv: true,
  exportJson: true,
  exportExcel: true,

  // Stage 2 — disabled until ready
  jiraWebhooks: false,
  batchGeneration: false,
  parallelGeneration: false,
  repositorySync: false,
  emailNotifications: false,
  slackNotifications: false,
  ragChat: false,

  // Stage 3 — disabled
  qualityScoring: false,
  advancedAnalytics: false,
  feedbackLoops: false,
};

// Usage in components
function Sidebar() {
  return (
    <nav>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/jira-tickets">Jira Tickets</NavLink>
      {/* ... */}
      {featureFlags.repositorySync && (
        <NavLink to="/repository-sync">Repository Sync</NavLink>
      )}
      {featureFlags.advancedAnalytics && (
        <NavLink to="/analytics">Analytics</NavLink>
      )}
    </nav>
  );
}
```

### 7.3 Incremental Rollout Strategy

| Stage | Frontend Changes | Backend Dependency |
|---|---|---|
| **Stage 1 → 1.1** | Enable `jiraWebhooks` flag, add Webhook Settings tab in Admin | Webhook controller in backend |
| **Stage 1 → 1.2** | Enable `parallelGeneration` flag, update progress UI for concurrent jobs | Multiple BullMQ workers |
| **Stage 2.0** | Enable `batchGeneration`, add Batch Generator page | Batch processing queue |
| **Stage 2.1** | Enable `repositorySync`, add Repository Sync page | XRAY/TestRail adapters |
| **Stage 2.2** | Enable `ragChat`, enhance chatbot with source citations | MongoDB + RAG pipeline |
| **Stage 3.0** | Enable `qualityScoring`, add quality badges to test cases | Evaluation engine |
| **Stage 3.1** | Enable `advancedAnalytics`, add Analytics page | Analytics backend |

---

## 8. Build & Development Configuration

### 8.1 Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          table: ['@tanstack/react-table'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
        },
      },
    },
  },
});
```

### 8.2 Testing Strategy

| Test Type | Tool | Coverage Target |
|---|---|---|
| Unit tests | Vitest | Utility functions, hooks, permission logic — 80%+ |
| Component tests | Vitest + Testing Library | Shared components, form validation — 70%+ |
| Integration tests | Vitest + MSW (Mock Service Worker) | Page-level flows with mocked API — key happy paths |
| E2E tests (future) | Playwright | Critical workflows: login → generate → approve → export |
| Accessibility tests | axe-core + Vitest | Automated WCAG checks on all page components |

### 8.3 Environment Variables

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_APP_NAME=AI Test Case Generator

# .env.production
VITE_API_BASE_URL=https://testgen.internal.company.com/api/v1
VITE_SOCKET_URL=https://testgen.internal.company.com
VITE_APP_NAME=AI Test Case Generator
```

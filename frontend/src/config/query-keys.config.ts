export const queryKeys = {
  jiraTickets: {
    all: ['jira-tickets'] as const,
    list: (filters: any) => ['jira-tickets', 'list', filters] as const,
    detail: (id: string) => ['jira-tickets', 'detail', id] as const,
  },
  testCases: {
    all: ['test-cases'] as const,
    list: (filters: any) => ['test-cases', 'list', filters] as const,
    detail: (id: string) => ['test-cases', 'detail', id] as const,
  },
  generationQueue: {
    all: ['generation-queue'] as const,
    list: (status?: string) => ['generation-queue', 'list', status] as const,
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

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  socketURL: import.meta.env.VITE_SOCKET_URL || '/',
  timeout: 30000, // 30 seconds
};

export const ROUTES = {
  auth: {
    login: '/login',
    register: '/register',
  },
  dashboard: '/dashboard',
  jiraTickets: '/jira-tickets',
  generationQueue: '/generation-queue',
  testCases: '/test-cases',
  exports: '/exports',
  notifications: '/notifications',
  chatbot: '/chatbot',
  admin: '/admin',
};

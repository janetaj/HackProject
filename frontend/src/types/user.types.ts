export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
}

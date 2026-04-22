/**
 * @Roles() Decorator
 * Used to specify required roles for route handlers
 * Example: @Roles('admin', 'qa_lead')
 */

import { SetMetadata } from '@nestjs/common';

export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @param roles Array of allowed roles
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

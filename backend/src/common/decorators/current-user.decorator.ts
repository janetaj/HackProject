/**
 * @CurrentUser() Decorator
 * Used to extract current user from JWT token in request
 * Example: getCurrentUser(@CurrentUser() user: any)
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract current user from JWT token
 * Returns the user object from request (set by JwtAuthGuard)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

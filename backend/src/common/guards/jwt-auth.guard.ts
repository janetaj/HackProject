/**
 * JWT Authentication Guard
 * Validates JWT tokens in Authorization header
 * Extracts and validates the token, sets req.user if valid
 */

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Delegate to Passport strategy
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    if (err || !user) {
      throw new UnauthorizedException(
        `Unauthorized: ${info?.message || 'Invalid token'}`,
      );
    }

    return user;
  }

  /**
   * Extract JWT token from Authorization header
   * Expected format: Bearer <token>
   */
  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer') {
      return null;
    }

    return token || null;
  }
}

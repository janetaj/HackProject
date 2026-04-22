/**
 * Local Passport Strategy
 * Validates email/password credentials
 * Used for login endpoint
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

/**
 * Note: This strategy will be used by AuthService
 * In practice, AuthService.validateUser() will be called to verify credentials
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      usernameField: 'email', // Change from username to email
      passwordField: 'password',
    });
  }

  /**
   * Validate user credentials
   * This method should be called by the consumer (auth.service)
   * Passport will call this after extracting credentials from request body
   */
  validate(email: string, password: string): any {
    // In practice, this validation is handled by AuthService.validateUser()
    // This is a placeholder to satisfy PassportStrategy interface
    throw new UnauthorizedException('Use AuthService.validateUser() instead');
  }
}

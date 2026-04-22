/**
 * JWT Passport Strategy
 * Validates JWT tokens and extracts user information
 */

import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../config/jwt.config';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('JWT_CONFIG_PROVIDER') jwtConfig: JwtConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
      algorithm: jwtConfig.algorithm,
    });
  }

  /**
   * Validates JWT payload
   * Called after token is decoded but before authorization
   */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

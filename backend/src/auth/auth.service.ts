/**
 * Authentication Service
 * Core auth logic: JWT generation, password hashing, token management
 */

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig } from '../config/config.module';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto, TokenRefreshResponseDto } from './dto/auth-response.dto';
import { UsersRepository } from '../users/users.repository';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds = 12;

  constructor(
    private jwtService: JwtService,
    @Inject('APP_CONFIG') private appConfig: AppConfig,
    private usersRepository: UsersRepository,
  ) {}

  /**
   * Register a new user
   * @param email User email
   * @param name User name
   * @param password Plain text password
   * @returns AuthResponseDto with tokens
   */
  async register(
    email: string,
    name: string,
    password: string,
  ): Promise<AuthResponseDto> {
    // Check if user already exists
    const existing = await this.usersRepository.findByEmail(email.toLowerCase());
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user in database
    const user = new User();
    user.id = uuidv4();
    user.email = email.toLowerCase();
    user.name = name;
    user.password_hash = passwordHash;
    user.role = 'qa_tester'; // Default role
    user.is_active = true;
    user.jira_api_token_encrypted = null;
    user.jira_token_validated_at = null;
    user.deleted_at = null;

    const savedUser = await this.usersRepository.save(user);

    this.logger.log(`User registered and saved to database: ${savedUser.email} (id: ${savedUser.id})`);

    // Generate tokens
    return this.generateAuthResponse(savedUser);
  }

  /**
   * Validate user credentials
   * Called during login to verify email/password
   * @param email User email
   * @param password Plain text password
   * @returns User object if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<any | null> {
    // Fetch user from database
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return null;
    }

    if (!user.is_active) {
      this.logger.warn(`Login attempt for inactive user: ${email}`);
      return null;
    }

    // Compare passwords
    const isPasswordValid = await this.comparePasswords(
      password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for: ${email}`);
      return null;
    }

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login user
   * @param email User email
   * @param password Plain text password
   * @returns AuthResponseDto with tokens
   */
  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`User logged in: ${email}`);

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  /**
   * Generate auth response with JWT tokens
   * @param user User object
   * @returns AuthResponseDto
   */
  private async generateAuthResponse(user: any): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.appConfig.jwt.secret,
      expiresIn: this.appConfig.jwt.accessExpirySeconds,
      algorithm: this.appConfig.jwt.algorithm as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.appConfig.jwt.refreshSecret,
      expiresIn: this.appConfig.jwt.refreshExpirySeconds,
      algorithm: this.appConfig.jwt.algorithm as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.appConfig.jwt.accessExpirySeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken Valid refresh token
   * @returns TokenRefreshResponseDto with new access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResponseDto> {
    try {
      // Verify refresh token signature
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.appConfig.jwt.refreshSecret,
        algorithms: [this.appConfig.jwt.algorithm as any],
      });

      // Verify user still exists and is active
      const user = await this.usersRepository.findById(payload.id);
      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const newAccessToken = this.jwtService.sign(
        {
          id: payload.id,
          email: payload.email,
          name: payload.name,
          role: payload.role,
        },
        {
          secret: this.appConfig.jwt.secret,
          expiresIn: this.appConfig.jwt.accessExpirySeconds,
          algorithm: this.appConfig.jwt.algorithm as any,
        },
      );

      return {
        accessToken: newAccessToken,
        expiresIn: this.appConfig.jwt.accessExpirySeconds,
      };
    } catch (error) {
      this.logger.warn(`Refresh token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user by invalidating refresh token
   * @param userId User ID
   * @param refreshToken Refresh token to invalidate
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    // TODO: Invalidate refresh token in database (token blacklist)
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Hash password using bcrypt
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Compare password with hash
   * @param password Plain text password
   * @param hash Hashed password
   * @returns true if password matches hash
   */
  private async comparePasswords(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate JWT payload (called by JwtStrategy)
   * @param payload JWT payload
   * @returns User object
   */
  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    // Fetch user from database to ensure user still exists and is active
    const user = await this.usersRepository.findById(payload.id);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

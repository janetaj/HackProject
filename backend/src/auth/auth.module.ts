/**
 * Auth Module
 * Handles user authentication, JWT token management, and authorization
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule, AppConfig } from '../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Configuration will be provided at runtime
    ConfigModule, // Import config module
    UsersModule, // Import users module for database operations
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    {
      provide: 'JWT_CONFIG_PROVIDER',
      useFactory: (appConfig: AppConfig) => appConfig.jwt,
      inject: ['APP_CONFIG'],
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

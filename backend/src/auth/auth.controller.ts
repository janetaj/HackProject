/**
 * Authentication Controller
 * Handles all auth endpoints: register, login, refresh, logout, me
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, TokenRefreshResponseDto, RefreshTokenDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registration attempt for: ${registerDto.email}`);
    const result = await this.authService.register(
      registerDto.email,
      registerDto.name,
      registerDto.password,
    );
    this.logger.log(`Registration successful: ${registerDto.email}`);
    return result;
  }

  /**
   * POST /api/v1/auth/login
   * Login and receive JWT access + refresh tokens
   */
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login and receive JWT access + refresh tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for: ${loginDto.email}`);
    const result = await this.authService.login(loginDto.email, loginDto.password);
    this.logger.log(`Login successful: ${loginDto.email}`);
    return result;
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: TokenRefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<TokenRefreshResponseDto> {
    this.logger.debug('Token refresh attempt');
    const result = await this.authService.refreshAccessToken(refreshToken);
    this.logger.debug('Token refresh successful');
    return result;
  }

  /**
   * POST /api/v1/auth/logout
   * Logout and invalidate refresh token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Logout attempt for: ${user.email}`);
    await this.authService.logout(user.id, refreshToken);
    return { message: 'Successfully logged out' };
  }

  /**
   * GET /api/v1/auth/me
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getCurrentUser(@CurrentUser() user: JwtPayload): Promise<JwtPayload> {
    this.logger.debug(`Get current user: ${user.email}`);
    return user;
  }
}

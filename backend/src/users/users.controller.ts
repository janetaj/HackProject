/**
 * Users Controller
 * REST API endpoints for user management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, PaginatedUserResponseDto } from './dto/user-response.dto';
import { UpdateJiraTokenDto, JiraTokenValidationResponseDto } from './dto/jira-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth()
@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * List all users (paginated)
   */
  @Get()
  @Roles('admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users', type: PaginatedUserResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ): Promise<PaginatedUserResponseDto> {
    this.logger.debug(`Fetching users - page: ${page}, pageSize: ${pageSize}`);
    return this.usersService.findAll(parseInt(page, 10), parseInt(pageSize, 10));
  }

  /**
   * POST /api/v1/users
   * Create a new user
   */
  @Post()
  @Roles('admin')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Creating user: ${createUserDto.email}`);
    return this.usersService.create(createUserDto);
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    if (user.id !== id && user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    this.logger.debug(`Fetching user: ${id}`);
    return this.usersService.findById(id);
  }

  /**
   * PATCH /api/v1/users/:id
   * Update user details
   */
  @Patch(':id')
  @Roles('admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update user details' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`Updating user: ${id}`);
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * DELETE /api/v1/users/:id
   * Soft-delete a user
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting user: ${id}`);
    return this.usersService.delete(id);
  }

  /**
   * PATCH /api/v1/users/:id/jira-token
   * Store or update Jira API token (encrypted)
   */
  @Patch(':id/jira-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Store or update Jira API token (encrypted)' })
  @ApiBody({ type: UpdateJiraTokenDto })
  @ApiResponse({ status: 200, description: 'Jira token updated', type: JiraTokenValidationResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateJiraToken(
    @Param('id') id: string,
    @Body() updateJiraTokenDto: UpdateJiraTokenDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<JiraTokenValidationResponseDto> {
    if (user.id !== id && user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    this.logger.log(`Updating Jira token for user: ${id}`);
    return this.usersService.updateJiraToken(id, updateJiraTokenDto);
  }

  /**
   * DELETE /api/v1/users/:id/jira-token
   * Clear user's Jira API token
   */
  @Delete(':id/jira-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear Jira API token for user' })
  @ApiResponse({ status: 200, description: 'Jira token cleared successfully' })
  async clearJiraToken(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    if (user.id !== id && user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    this.logger.log(`Clearing Jira token for user: ${id}`);
    return this.usersService.clearJiraToken(id);
  }

  /**
   * GET /api/v1/users/:id/jira-status
   * Check if user has valid Jira token
   */
  @Get(':id/jira-status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check if user has a valid Jira token' })
  @ApiResponse({ status: 200, description: 'Jira token status' })
  async getJiraTokenStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ hasToken: boolean }> {
    if (user.id !== id && user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    this.logger.debug(`Checking Jira token status for user: ${id}`);
    const hasToken = await this.usersService.hasJiraToken(id);
    return { hasToken };
  }
}

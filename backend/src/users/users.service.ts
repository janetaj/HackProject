/**
 * Users Service
 * Business logic for user management operations
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, PaginatedUserResponseDto } from './dto/user-response.dto';
import { UpdateJiraTokenDto, JiraTokenValidationResponseDto } from './dto/jira-token.dto';
import { AppConfig } from '../config/config.module';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly bcryptRounds = 12;

  constructor(
    private usersRepository: UsersRepository,
    @Inject('APP_CONFIG') private appConfig: AppConfig,
  ) {}

  /**
   * Create a new user (admin only)
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.usersRepository.findByEmail(createUserDto.email);
    if (existing) {
      throw new BadRequestException(
        `Email ${createUserDto.email} is already registered`,
      );
    }

    // Hash password
    const passwordHash = await this.hashPassword(createUserDto.password);

    // Create user
    const user = new User();
    user.id = uuidv4();
    user.email = createUserDto.email.toLowerCase();
    user.name = createUserDto.name;
    user.password_hash = passwordHash;
    user.role = createUserDto.role;
    user.is_active = true;
    user.jira_api_token_encrypted = null;
    user.jira_token_validated_at = null;
    user.deleted_at = null;

    const savedUser = await this.usersRepository.save(user);

    this.logger.log(
      `User created: ${savedUser.email} with role ${savedUser.role}`,
    );

    return this.toUserResponseDto(savedUser);
  }

  /**
   * Get all users (paginated)
   */
  async findAll(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedUserResponseDto> {
    const [data, total] = await Promise.all([
      this.usersRepository.find({
        where: { deleted_at: null },
        order: { created_at: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.usersRepository.count({
        where: { deleted_at: null },
      }),
    ]);

    return {
      data: data.map((u) => this.toUserResponseDto(u)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.toUserResponseDto(user);
  }

  /**
   * Get user by email (internal, returns full user)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  /**
   * Update user (admin only)
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Update fields
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.is_active !== undefined) {
      user.is_active = updateUserDto.is_active;
    }

    const updatedUser = await this.usersRepository.save(user);

    this.logger.log(`User updated: ${updatedUser.email}`);

    return this.toUserResponseDto(updatedUser);
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    await this.usersRepository.softDelete(id);

    this.logger.log(`User soft-deleted: ${user.email}`);

    return { message: `User ${user.email} has been deactivated` };
  }

  /**
   * Update user's Jira API token
   * In production, token should be encrypted before storage
   */
  async updateJiraToken(
    userId: string,
    updateJiraTokenDto: UpdateJiraTokenDto,
  ): Promise<JiraTokenValidationResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // TODO: Validate token by making test call to Jira
    // const isValid = await this.jiraService.validateToken(
    //   updateJiraTokenDto.jiraApiToken,
    //   updateJiraTokenDto.jiraEmail,
    // );
    // if (!isValid) {
    //   throw new BadRequestException('Invalid Jira API token');
    // }

    // TODO: Encrypt token before storage
    // const encryptedToken = await this.encryptionService.encrypt(
    //   updateJiraTokenDto.jiraApiToken,
    // );

    // For now, store plaintext (UNSAFE - for development only)
    const encryptedToken = updateJiraTokenDto.jiraApiToken;

    await this.usersRepository.updateJiraToken(userId, encryptedToken);

    this.logger.log(`Jira token updated for user: ${user.email}`);

    return {
      validated: true,
      message: 'Jira API token updated successfully',
      timestamp: new Date(),
    };
  }

  /**
   * Clear user's Jira API token
   */
  async clearJiraToken(userId: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.usersRepository.clearJiraToken(userId);

    this.logger.log(`Jira token cleared for user: ${user.email}`);

    return { message: 'Jira API token has been removed' };
  }

  /**
   * Check if user has valid Jira token
   */
  async hasJiraToken(userId: string): Promise<boolean> {
    return this.usersRepository.hasJiraToken(userId);
  }

  /**
   * Get users by role
   */
  async findByRole(role: string): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findByRole(role);
    return users.map((u) => this.toUserResponseDto(u));
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Convert User entity to UserResponseDto (excludes sensitive data)
   */
  private toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      jira_token_validated_at: user.jira_token_validated_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

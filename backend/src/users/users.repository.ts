/**
 * Users Repository
 * Custom database queries for User operations
 */

import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: {
        email: email.toLowerCase(),
        deleted_at: null,
      },
    });
  }

  /**
   * Find user by ID (excludes soft-deleted)
   */
  async findById(id: string): Promise<User | null> {
    return this.findOne({
      where: {
        id,
        deleted_at: null,
      },
    });
  }

  /**
   * Find all active users with pagination
   */
  async findAllActive(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.findAndCount({
      where: {
        deleted_at: null,
      },
      order: { created_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { data, total };
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    return this.find({
      where: {
        role: role as any,
        deleted_at: null,
      },
    });
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.count({
      where: {
        email: email.toLowerCase(),
        deleted_at: null,
      },
    });
    return count > 0;
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: string): Promise<any> {
    return this.update(id, {
      deleted_at: new Date(),
      is_active: false,
    });
  }

  /**
   * Restore a soft-deleted user
   */
  async restore(id: string): Promise<any> {
    return this.update(id, {
      deleted_at: null,
      is_active: true,
    });
  }

  /**
   * Update Jira token and validation timestamp
   */
  async updateJiraToken(
    id: string,
    encryptedToken: string,
  ): Promise<boolean> {
    const result = await this.update(id, {
      jira_api_token_encrypted: encryptedToken,
      jira_token_validated_at: new Date(),
    });
    return result.affected > 0;
  }

  /**
   * Clear Jira token (logout from Jira)
   */
  async clearJiraToken(id: string): Promise<boolean> {
    const result = await this.update(id, {
      jira_api_token_encrypted: null,
      jira_token_validated_at: null,
    });
    return result.affected > 0;
  }

  /**
   * Check if user has Jira token stored
   */
  async hasJiraToken(id: string): Promise<boolean> {
    const user = await this.findById(id);
    return user ? !!user.jira_api_token_encrypted : false;
  }
}

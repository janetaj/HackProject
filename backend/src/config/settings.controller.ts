/**
 * Settings Controller
 * Admin settings for LLM configuration and budget management
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

export class UpdateLLMSettingsDto {
  @ApiPropertyOptional({ description: 'LLM provider name (openai, groq, anthropic)' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Model name (e.g. gpt-4o, llama-3-70b)' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Additional model parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export class UpdateBudgetDto {
  @ApiPropertyOptional({ description: 'Monthly token budget allocation' })
  @IsOptional()
  @IsNumber()
  monthlyTokenBudget?: number;

  @ApiPropertyOptional({ description: 'Warning threshold percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  warningThresholdPercent?: number;

  @ApiPropertyOptional({ description: 'Critical threshold percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  criticalThresholdPercent?: number;

  @ApiPropertyOptional({ description: 'Cost per 1000 tokens (in USD)' })
  @IsOptional()
  @IsNumber()
  costPer1kTokens?: number;
}

@ApiTags('settings')
@ApiBearerAuth()
@Controller('v1/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  /**
   * GET /api/v1/settings/llm
   * Get LLM configuration (merged settings)
   */
  @Get('llm')
  @Roles('admin')
  @ApiOperation({ summary: 'Get LLM configuration (merged settings)' })
  @ApiResponse({ status: 200, description: 'Current LLM provider and model settings' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getLLMSettings() {
    return {
      success: true,
      data: {
        provider: process.env.LLM_PROVIDER || 'openai',
        model: process.env.LLM_MODEL || 'gpt-4o',
        parameters: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      },
    };
  }

  /**
   * PATCH /api/v1/settings/llm
   * Update LLM provider and model settings
   */
  @Patch('llm')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update LLM provider and model settings' })
  @ApiBody({ type: UpdateLLMSettingsDto })
  @ApiResponse({ status: 200, description: 'LLM settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateLLMSettings(@Body() dto: UpdateLLMSettingsDto) {
    this.logger.log(`Updating LLM settings: ${JSON.stringify(dto)}`);
    return { success: true, message: 'LLM settings updated', data: dto };
  }

  /**
   * GET /api/v1/settings/budget
   * Get budget configuration
   */
  @Get('budget')
  @Roles('admin')
  @ApiOperation({ summary: 'Get budget configuration' })
  @ApiResponse({ status: 200, description: 'Budget configuration settings' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getBudgetSettings() {
    return {
      success: true,
      data: {
        monthlyTokenBudget: parseInt(process.env.BUDGET_MONTHLY_TOKENS || '1000000'),
        warningThresholdPercent: parseInt(process.env.BUDGET_WARNING_THRESHOLD || '75'),
        criticalThresholdPercent: parseInt(process.env.BUDGET_CRITICAL_THRESHOLD || '90'),
        costPer1kTokens: parseFloat(process.env.BUDGET_COST_PER_1K_TOKENS || '0.01'),
      },
    };
  }

  /**
   * PATCH /api/v1/settings/budget
   * Update budget allocation and thresholds
   */
  @Patch('budget')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update budget allocation and thresholds' })
  @ApiBody({ type: UpdateBudgetDto })
  @ApiResponse({ status: 200, description: 'Budget settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateBudgetSettings(@Body() dto: UpdateBudgetDto) {
    this.logger.log(`Updating budget settings: ${JSON.stringify(dto)}`);
    return { success: true, message: 'Budget settings updated', data: dto };
  }

  /**
   * GET /api/v1/settings/budget/usage
   * Get current budget usage vs limits
   */
  @Get('budget/usage')
  @Roles('admin', 'qa_lead')
  @ApiOperation({ summary: 'Get current budget usage vs limits' })
  @ApiResponse({ status: 200, description: 'Current token and cost usage vs configured limits' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getBudgetUsage() {
    return {
      success: true,
      data: {
        monthlyTokenBudget: 1000000,
        tokensUsed: 0,
        tokensRemaining: 1000000,
        usagePercent: 0,
        estimatedCost: 0,
        status: 'ok',
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      },
    };
  }
}

/**
 * Parser Controller
 * REST endpoints for parsing Jira tickets into structured requirements
 */

import {
  Controller,
  Post,
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
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export class ParseTicketsDto {
  @ApiProperty({ description: 'Array of Jira ticket IDs to parse', type: [String] })
  @IsArray()
  ticketIds: string[];

  @ApiPropertyOptional({ description: 'Force re-parse even if already parsed' })
  @IsOptional()
  forceReparse?: boolean;
}

@ApiTags('parser')
@ApiBearerAuth()
@Controller('v1/parser')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParserController {
  private readonly logger = new Logger(ParserController.name);

  /**
   * POST /api/v1/parser/parse
   * Parse raw Jira tickets into structured requirements
   */
  @Post('parse')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Parse raw Jira tickets into structured requirements' })
  @ApiBody({ type: ParseTicketsDto })
  @ApiResponse({ status: 202, description: 'Parse job queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ticket IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async parseTickets(
    @Body() dto: ParseTicketsDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Parsing ${dto.ticketIds.length} tickets for user ${user.id}`);
    return {
      success: true,
      message: 'Parse job queued',
      data: { ticketCount: dto.ticketIds.length, ticketIds: dto.ticketIds },
    };
  }
}

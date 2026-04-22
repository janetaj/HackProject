/**
 * Export Module
 * Test case export feature with multiple format support
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ExportController } from './controllers/export.controller';
import { ExportService } from './services/export.service';
import { ExportRepository } from './repositories/export.repository';
import { ExportHistory } from './entities/export-history.entity';

// Export Adapters
import { CsvExportAdapter } from './adapters/csv-export.adapter';
import { JsonExportAdapter } from './adapters/json-export.adapter';
import { ExcelExportAdapter } from './adapters/excel-export.adapter';

// Import Common Module for guards and decorators
import { CommonModule } from '../common/common.module';
import { GeneratorModule } from '../generator/generator.module';
import { ExportListener } from './listeners/export.listener';

@Module({
  imports: [
    // Database
    TypeOrmModule.forFeature([ExportHistory]),

    // Event Emitter for async communication (forRoot is already in AppModule, so just Module is enough or remove if not needed, but keeping for safety)
    
    // Dependent modules
    CommonModule,
    GeneratorModule,
  ],

  controllers: [ExportController],

  providers: [
    ExportService,
    ExportRepository,
    ExportListener,
    // Export Adapters
    CsvExportAdapter,
    JsonExportAdapter,
    ExcelExportAdapter,
  ],

  exports: [ExportService, ExportRepository],
})
export class ExportModule {}

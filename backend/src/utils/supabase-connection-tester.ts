/**
 * Supabase Database Connection Test Utility
 * Tests connectivity and validates configuration
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../app.module';

export class SupabaseConnectionTester {
  private configService: ConfigService;

  async testConnection(): Promise<void> {
    try {
      console.log('\n🔍 Testing Supabase Database Connection...\n');

      const app = await NestFactory.createApplicationContext(AppModule);
      const configService = app.get(ConfigService);

      const dbHost = configService.get('DB_HOST');
      const dbPort = configService.get('DB_PORT');
      const dbUser = configService.get('DB_USER');
      const dbName = configService.get('DB_NAME');
      const dbSSL = configService.get('DB_SSL');

      console.log('📋 Configuration Summary:');
      console.log(`   Host: ${dbHost}`);
      console.log(`   Port: ${dbPort}`);
      console.log(`   User: ${dbUser}`);
      console.log(`   Database: ${dbName}`);
      console.log(`   SSL Enabled: ${dbSSL === 'true' ? '✓ Yes' : '✗ No'}`);
      console.log(`   Is Supabase: ${dbHost?.includes('supabase.co') ? '✓ Yes' : '✗ No'}\n`);

      // Get DataSource
      const dataSource = app.get('DataSource');

      if (!dataSource) {
        throw new Error('DataSource not available - ensure TypeORM is properly configured');
      }

      // Test basic connection
      console.log('🔗 Testing connection...');
      const queryRunner = dataSource.createQueryRunner();

      try {
        await queryRunner.connect();
        console.log('✓ Connection successful!\n');

        // Test database accessibility
        console.log('📊 Database Information:');
        const dbVersion = await queryRunner.query('SELECT version()');
        console.log(`   PostgreSQL Version: ${dbVersion[0].version.split(' ')[1]}\n`);

        // Check tables
        console.log('📋 Checking table existence:');
        const tables = [
          'user',
          'jira_ticket',
          'test_case',
          'test_step',
          'notification',
          'export_history',
          'chat_session',
          'audit_log',
          'llm_usage',
          'budget_tracking',
          'jira_integration',
          'notification_preference',
          'system_metric',
        ];

        for (const table of tables) {
          try {
            const result = await queryRunner.query(
              `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
              [table],
            );
            const exists = result[0].exists;
            console.log(`   ${exists ? '✓' : '✗'} ${table}`);
          } catch (error) {
            console.log(`   ? ${table} (error checking)`);
          }
        }

        console.log('\n✅ Connection test PASSED!\n');
      } finally {
        await queryRunner.release();
      }

      await app.close();
    } catch (error) {
      console.error('\n❌ Connection test FAILED!');
      console.error(`Error: ${error.message}\n`);
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const tester = new SupabaseConnectionTester();
  tester.testConnection();
}

export default SupabaseConnectionTester;

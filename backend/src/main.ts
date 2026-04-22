/**
 * Main Bootstrap File
 * Initializes and starts the NestJS application
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // ============================================
  // Security & Middleware Configuration
  // ============================================

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development/Swagger
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN;
  const origins = corsOrigin 
    ? corsOrigin.includes(',') ? corsOrigin.split(',') : [corsOrigin]
    : ['http://localhost:3001', 'http://localhost:3000'];

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID', 'Accept'],
    exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Remaining'],
    maxAge: 3600,
  });


  // Response compression
  app.use(compression());

  // Cookie parsing
  app.use(cookieParser());

  // ============================================
  // API Configuration
  // ============================================

  // Global route prefix - all routes will be prefixed with /api
  // Note: Controllers use paths like 'v1/auth', 'health', 'dashboard' etc.
  // The global prefix adds /api, resulting in /api/v1/auth, /api/health, etc.
  app.setGlobalPrefix('api');

  // ============================================
  // Global Pipes (Validation & Transformation)
  // ============================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error if unknown properties present
      transform: true, // Auto-transform payloads to DTOs
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidUnknownValues: true,
    }),
  );

  // ============================================
  // Global Interceptors (Request/Response Processing)
  // ============================================

  // Logging interceptor (logs all requests/responses)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Audit interceptor is registered in module providers to handle DI

  // ============================================
  // Global Exception Filters (Error Handling)
  // ============================================

  // Global exception filter is registered in module providers to handle DI

  // ============================================
  // Swagger Setup Configuration
  // ============================================

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Test Case Generator API')
    .setDescription(
      'Complete API documentation for the AI-powered Test Case Generator backend.\n\n' +
      'Click **Authorize** and enter your JWT token (from `/api/v1/auth/login`) to test protected endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', description: 'Enter JWT token from /api/v1/auth/login' },
      'bearer',
    )
    .addTag('auth', 'Authentication & authorization')
    .addTag('users', 'User management')
    .addTag('jira', 'Jira integration')
    .addTag('generation', 'Test case generation queue')
    .addTag('test-cases', 'Test case management')
    .addTag('exports', 'Export management')
    .addTag('notifications', 'Notifications')
    .addTag('chatbot', 'AI Chatbot')
    .addTag('dashboard', 'Dashboard & analytics')
    .addTag('settings', 'Admin settings')
    .addTag('health', 'Health checks')
    .addTag('metrics', 'System metrics')
    .addTag('parser', 'Parse raw Jira tickets into structured requirements')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ============================================
  // Runtime Configuration
  // ============================================

  const port = process.env.PORT || 3000;
  const environment = process.env.NODE_ENV || 'development';

  // ============================================
  // Start Server
  // ============================================

  await app.listen(port, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║    🚀 NestJS Backend Server Started Successfully 🚀           ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Environment:        ${environment.toUpperCase().padEnd(40)}║
║  Port:               ${port.toString().padEnd(40)}║
║  URL:                http://localhost:${port}/api                  ║
║  Health Check:       http://localhost:${port}/health               ║
║  API Docs:           http://localhost:${port}/api-docs             ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  Key Endpoints:                                                ║
║                                                                ║
║  📊 Dashboard:       GET /api/dashboard/*                     ║
║  🧪 Generator:       POST /api/generator/queue                ║
║  ✅ Test Cases:      GET /api/generator/test-cases            ║
║  📋 Jira Tickets:    GET /api/jira/tickets                    ║
║  👤 Users:           GET /api/users                           ║
║  🔐 Auth:            POST /api/auth/login                     ║
║  🤖 Chatbot:         POST /api/chatbot/message                ║
║  📤 Export:          POST /api/export/trigger                 ║
║  🔔 Notifications:   WS /ws/notifications                     ║
║  📊 Audit Logs:      GET /api/audit/search                    ║
║  ❤️  Health:         GET /health (liveness)                   ║
║  🔍 Readiness:       GET /health/ready                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);

    // Log module startup details
    console.log(`
📦 Loaded Modules:
  ✅ Common Module (Guards, Interceptors, Decorators, Filters)
  ✅ Auth Module (JWT, Passport Strategies)
  ✅ Users Module (CRUD, Role Management)
  ✅ Jira Module (API Integration, Polling)
  ✅ Parser Module (LLM-based Requirement Extraction)
  ✅ LLM Module (OpenAI & Groq Abstraction)
  ✅ Generator Module (Test Case Generation, BullMQ)
  ✅ Export Module (CSV, JSON, Excel Adapters)
  ✅ Notifications Module (WebSocket, Real-time)
  ✅ Chatbot Module (Intent Detection, MCP Integration)
  ✅ Audit Module (Immutable Logging, Compliance)
  ✅ Dashboard Module (Analytics, Metrics Aggregation)
  ✅ Health Module (K8s Probes, Component Status)

🔧 Infrastructure:
  ✅ Database:   PostgreSQL with TypeORM
  ✅ Cache:      Redis with BullMQ
  ✅ Events:     @nestjs/event-emitter
  ✅ Validation: class-validator, Zod
  ✅ Security:   Helmet, JWT, bcrypt
  ✅ Logging:    Winston, request/response tracking
  ✅ CORS:       Configured for development

🎯 Ready to accept requests!
    `);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

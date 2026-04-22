
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GeneratorService } from './src/generator/services/generator.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const generatorService = app.get(GeneratorService);
  try {
    const res = await generatorService.listQueue(undefined, '20' as any, '0' as any);
    console.log(res);
  } catch (err) {
    console.error('ERRORRR:', err);
  }
  await app.close();
}
bootstrap();

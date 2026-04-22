
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwt = app.get(JwtService);
  const token = jwt.sign({ id: '1', email: 'admin@ai-qa.com', roles: ['admin'] }, { secret: process.env.JWT_SECRET || 'secretKey' });
  
  try {
    const res = await axios.get('http://localhost:3000/api/v1/generation/queue', { headers: { Authorization: \Bearer \\ } });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    if (err.response) {
      console.log('API ERROR:', err.response.data);
    } else {
      console.error('NETWORK ERROR:', err.message);
    }
  }
  await app.close();
}
bootstrap();

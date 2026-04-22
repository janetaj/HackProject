
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module.js');
const { JwtService } = require('@nestjs/jwt');
const axios = require('axios');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const jwt = app.get(JwtService);
  const token = jwt.sign({ id: '1', email: 'admin@ai-qa.com', role: 'admin' }, { secret: process.env.JWT_SECRET || 'secretKey' });
  
  try {
    const res = await axios.get('http://localhost:3000/api/v1/generation/queue?limit=10&offset=0', { headers: { Authorization: 'Bearer ' + token } });
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

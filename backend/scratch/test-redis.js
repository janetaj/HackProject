const Redis = require('ioredis');
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  connectTimeout: 2000,
  maxRetriesPerRequest: 0
});

redis.on('error', (err) => {
  console.error('Redis Error:', err.message);
  process.exit(1);
});

redis.ping().then((res) => {
  console.log('Redis Ping Response:', res);
  process.exit(0);
}).catch((err) => {
  console.error('Redis Connection Failed:', err.message);
  process.exit(1);
});

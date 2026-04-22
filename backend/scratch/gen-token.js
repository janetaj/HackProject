const jwt = require('jsonwebtoken');
const fs = require('fs');
const dotenv = require('dotenv');

const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

const secret = process.env.JWT_SECRET;
const payload = {
  id: "34782f11-4213-41df-9c3f-60a74aa31c08",
  email: "janetjesus75@gmail.com",
  name: "Janet",
  role: "admin"
};

const token = jwt.sign(payload, secret, { expiresIn: '1d' });
console.log(token);

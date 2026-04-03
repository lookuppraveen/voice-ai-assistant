const app = require('./src/app');
const request = require('supertest');

async function run() {
  const res = await request(app)
    .post('/api/auth/register-company')
    .send({
      company_name: 'Test',
      admin_email: 'test@test.com',
      admin_password: 'password123',
      admin_name: 'Admin'
    });
  
  console.log('Status code:', res.statusCode);
  console.log('Body:', res.body);
  process.exit(0);
}

run();

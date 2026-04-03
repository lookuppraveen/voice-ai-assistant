require('dotenv').config();
const { pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createSuperAdmin() {
  const email = 'admin@demo.com';
  const password = 'admin1234';
  const fullName = 'Super Admin';

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Check if the generic super admin company exists
    const companyRes = await pool.query('SELECT id FROM companies WHERE name = $1', ['System Admin Group']);
    let companyId;
    
    if (companyRes.rows.length === 0) {
      const newCompany = await pool.query(
        'INSERT INTO companies (id, name) VALUES ($1, $2) RETURNING id',
        [uuidv4(), 'System Admin Group']
      );
      companyId = newCompany.rows[0].id;
    } else {
      companyId = companyRes.rows[0].id;
    }

    // Upsert the super admin
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (id, company_id, email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), companyId, email, passwordHash, fullName, 'system_admin']
      );
      console.log(`✅ Super Admin created successfully!\nEmail: ${email}\nPassword: ${password}`);
    } else {
      await pool.query(
        `UPDATE users SET password_hash = $1, role = $2 WHERE email = $3`,
        [passwordHash, 'system_admin', email]
      );
      console.log(`✅ Super Admin updated successfully!\nEmail: ${email}\nPassword: ${password}`);
    }

  } catch (err) {
    console.error('❌ Error creating super admin:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createSuperAdmin();

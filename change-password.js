#!/usr/bin/env node

const scrypt = require('scrypt-js');
const { Client } = require('pg');

async function hashPassword(password) {
  // Medusa v2 uses scrypt with these parameters
  const salt = Buffer.from('scrypt', 'utf8');
  const N = 8; // CPU cost
  const r = 8; // Memory cost
  const p = 1; // Parallelization
  const keylen = 64;

  const derivedKey = await scrypt.scrypt(Buffer.from(password, 'utf8'), salt, N, r, p, keylen);
  return Buffer.concat([
    Buffer.from('scrypt', 'utf8'),
    Buffer.from([0, 0, 8, 0, 0, 0, 0, 8, 0, 0, 0, 1]), // Parameters encoded
    derivedKey
  ]).toString('base64');
}

async function changePassword(email, newPassword) {
  const client = new Client({
    host: 'localhost',
    port: 55432,
    database: 'adhd-dev',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();

    // Hash the password using scrypt (Medusa v2 format)
    const hashedPassword = await hashPassword(newPassword);

    // Update the password in the provider_identity table
    const result = await client.query(`
      UPDATE provider_identity
      SET provider_metadata = jsonb_set(provider_metadata, '{password}', to_jsonb($1::text)),
          updated_at = NOW()
      WHERE entity_id = $2 AND provider = 'emailpass'
    `, [hashedPassword, email]);

    if (result.rowCount > 0) {
      console.log(`✅ Password updated successfully for ${email}`);
      console.log(`New password: ${newPassword}`);
      console.log(`\nYou can now login to the admin panel at http://localhost:9000/app`);
    } else {
      console.log(`❌ User with email ${email} not found or not using emailpass provider`);
      console.log(`\nTip: Make sure the user exists and uses email/password authentication`);
    }

  } catch (error) {
    console.error('Error updating password:', error.message);
  } finally {
    await client.end();
  }
}

// Get password from command line argument or use default
const newPassword = process.argv[2] || 'new-secure-password';
const email = 'admin@adhd.toys';

changePassword(email, newPassword);
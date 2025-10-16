import { pgConnectionLoader } from '@medusajs/framework';
import { loadEnv } from '@medusajs/utils';

loadEnv('test', process.cwd());

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
  console.log('Loading pg connection...');
  const conn = await pgConnectionLoader();
  console.log('Connection established:', !!conn);
  await conn.end();
  console.log('Connection closed successfully');
} catch(err) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}

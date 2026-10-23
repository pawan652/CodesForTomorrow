import app from './app';
import { pool } from './config/db';

const portValue = Number(process.env.PORT || 5000);
const port = Number.isInteger(portValue) && portValue > 0 ? portValue : 5000;

async function start(): Promise<void> {
  await pool.query('SELECT 1');
  console.log('MySQL connection successful');
  await pool.query('UPDATE users SET is_online = 0');

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

start().catch((error: unknown) => {
  console.error('Server failed to start');
  console.error(error);
  process.exit(1);
});

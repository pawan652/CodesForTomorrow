import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const portValue = Number(process.env.MYSQL_PORT || 3306);
const port = Number.isInteger(portValue) && portValue > 0 ? portValue : 3306;

// Mysql connection pool creation

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST?.trim() || 'localhost',
  port,
  user: process.env.MYSQL_USER ?? '',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? '',
  charset: 'utf8mb4',
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 10,
});

import { query } from '../config/db.js';
import type { CreateUserData, User, UserRow } from '../models/user.model.js';
import { toUser } from '../models/user.model.js';
import { InternalServerError } from '../utils/api-error.js';

/**
 * Database access for the `users` table.
 *
 * This layer performs SQL and row mapping only - no business rules, no password
 * hashing, no JWT handling. Every query is parameterised, so user input can
 * never be interpolated into SQL text.
 */

const USER_COLUMNS = 'id, name, email, password_hash, role, created_at, updated_at';

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const { rows } = await query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1 LIMIT 1`, [email]);
  const row = rows[0];

  return row ? toUser(row) : null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const { rows } = await query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`, [id]);
  const row = rows[0];

  return row ? toUser(row) : null;
};

export const createUser = async (data: CreateUserData): Promise<User> => {
  const { rows } = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${USER_COLUMNS}`,
    [data.name, data.email, data.passwordHash, data.role],
  );

  const row = rows[0];

  if (!row) {
    throw new InternalServerError('User could not be created');
  }

  return toUser(row);
};

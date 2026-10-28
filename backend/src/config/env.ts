import 'dotenv/config';
import { z } from 'zod';
export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().default(4000),
    APP_ORIGIN: z.string().url().default('http://localhost:5173'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  })
  .parse(process.env);

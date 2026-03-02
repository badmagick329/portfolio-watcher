import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/infra/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_DB!,
  },
});

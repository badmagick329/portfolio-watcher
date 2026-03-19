import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './packages/infra/src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_DB!,
  },
});

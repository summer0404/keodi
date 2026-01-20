import { defineConfig, env } from "prisma/config";
import 'dotenv/config';

export default defineConfig({
    schema: '../database/prisma/schema.prisma',
    migrations: {
        path: '../database/prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL')
    }
})
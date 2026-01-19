import { defineConfig, env } from "prisma/config";
import 'dotenv/config';

export default defineConfig({
    schema: 'src/database/prisma/schema.prisma',
    migrations: {
        path: 'src/database/prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL')
    }
})
import { Prisma } from '@prisma/client';

export type ExtractedIntent = {
  keywords?: string;
  embedding?: number[];
};

export type SearchQueryConfig = {
  searchCondition: Prisma.Sql;
  similarityColumn: Prisma.Sql;
  searchOrderBy: string;
};

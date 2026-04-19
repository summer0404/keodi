import { Injectable } from '@nestjs/common';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';
import { PrismaService } from 'src/database/prisma.service';
import Fuse from 'fuse.js';
import { CategoryConstant } from 'src/shared/constants/category.constant';

@Injectable()
export class CategoryService {
  private fuse: Fuse<any> | null = null;
  private categoriesCache: any[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    await this.loadCategories();
  }

  private async loadCategories() {
    this.categoriesCache = await this.prismaService.category.findMany();
    this.fuse = new Fuse(this.categoriesCache, {
      keys: ['name'],
      threshold: 0.4, // typo tolerance
      distance: 100,
      includeScore: true,
      useExtendedSearch: true, // enables ^prefix syntax
      minMatchCharLength: 1, // match from first character
      shouldSort: true,
    });
  }

  async getListOnBoarding() {
    try {
      return await this.prismaService.category.findMany({
        where: {
          isSelectable: true,
        },
      });
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async search(query: string, limit = CategoryConstant.SEARCH_LIMIT) {
    if (!this.fuse) await this.loadCategories();
    if (!query?.trim()) return this.categoriesCache.slice(0, limit);

    const prefixResults = this.fuse!.search(`^${query}`, { limit });
    const fuzzyResults = this.fuse!.search(query, { limit });

    const seen = new Set<string>();
    const combined = [];
    for (const r of [...prefixResults, ...fuzzyResults]) {
      if (!seen.has(r.item.id)) {
        seen.add(r.item.id);
        combined.push({ ...r.item, score: r.score });
      }
    }
    return combined.slice(0, limit);
  }

  async invalidateCache() {
    await this.loadCategories();
  }
}

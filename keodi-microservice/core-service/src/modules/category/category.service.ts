import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import Fuse from 'fuse.js';
import { PrismaService } from 'src/database/prisma.service';
import { CategoryConstant } from 'src/shared/constants/category.constant';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';

type CategoryWithCount = Category & { _count: { placeCategories: number } };
type CategorySearchResult = Omit<Category, 'isSelectable'> & {
  placeCount: number;
  score?: number;
};

@Injectable()
export class CategoryService {
  private fuse: Fuse<CategoryWithCount> | null = null;
  private categoriesCache: CategoryWithCount[] = [];

  constructor(private readonly prismaService: PrismaService) { }

  async onModuleInit() {
    await this.loadCategories();
  }

  private async loadCategories() {
    const categories = await this.prismaService.category.findMany({
      include: { _count: { select: { placeCategories: true } } },
    });

    // Pre-sort by popularity so Fuse.js uses this as tiebreaker
    this.categoriesCache = categories.sort(
      (a, b) => b._count.placeCategories - a._count.placeCategories,
    );

    this.fuse = new Fuse(this.categoriesCache, {
      keys: ['name'],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
      useExtendedSearch: true,
      minMatchCharLength: 1,
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

  private toSearchResult(
    category: CategoryWithCount,
    score?: number,
  ): CategorySearchResult {
    const { id, name, _count } = category;

    return {
      id,
      name,
      placeCount: _count.placeCategories,
      ...(score !== undefined ? { score } : {}),
    };
  }

  async search(query: string, limit = CategoryConstant.SEARCH_LIMIT) {
    if (!this.fuse) await this.loadCategories();
    const normalizedQuery = query?.trim() ?? '';

    if (!normalizedQuery) {
      return this.categoriesCache
        .slice(0, limit)
        .map((category) => this.toSearchResult(category));
    }

    const prefixResults = this.fuse!.search(`^${normalizedQuery}`, { limit });
    const fuzzyResults = this.fuse!.search(normalizedQuery, { limit });

    const combined = new Map<string, CategorySearchResult>();
    for (const r of [...prefixResults, ...fuzzyResults]) {
      const current = combined.get(r.item.id);
      const next = this.toSearchResult(r.item, r.score);

      if (!current || (next.score ?? 1) < (current.score ?? 1)) {
        combined.set(r.item.id, next);
      }
    }

    return [...combined.values()]
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, limit);
  }

  async invalidateCache() {
    await this.loadCategories();
  }
}

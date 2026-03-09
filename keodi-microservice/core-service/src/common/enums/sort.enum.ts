export enum SortBy {
  CREATED_AT = 'createdAt',
}

export enum PlaceSortBy {
  DISTANCE = 'distance',
  RATING = 'rating',
  NAME = 'name',
  CREATED_AT = SortBy.CREATED_AT,
}

export enum FriendSortBy {
  NAME = 'name',
  CREATED_AT = SortBy.CREATED_AT,
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

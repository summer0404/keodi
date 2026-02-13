export enum SortBy {
  DISTANCE = 'distance',
  RATING = 'rating',
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export enum FriendSortBy {
  NAME = SortBy.NAME,
  CREATED_AT = SortBy.CREATED_AT,
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

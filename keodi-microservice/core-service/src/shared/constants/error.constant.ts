export const OwnerApplicationErrorMessages = {
  OWNER_APPLICATION_ALREADY_EXISTS: 'OWNER_APPLICATION_ALREADY_EXISTS',
  OWNER_APPLICATION_NOT_FOUND: 'OWNER_APPLICATION_NOT_FOUND',
  OWNER_APPLICATION_ALREADY_REVIEWED: 'OWNER_APPLICATION_ALREADY_REVIEWED',
} as const;

export const UserErrorMessages = {
  USER_NOT_FOUND: 'User not found',
  USER_NOT_FOUND_CODE: 'USER_NOT_FOUND',
  PHONE_NUMBER_ALREADY_IN_USE: 'Phone number already in use',
} as const;

export const FriendErrorMessages = {
  CANNOT_SEND_REQUEST_TO_SELF: 'Cannot send friend request to yourself',
  USER_NOT_FOUND: 'User not found',
  ALREADY_FRIENDS_WITH_USER: 'Already friends with this user',
  FRIEND_REQUEST_ALREADY_EXISTS: 'Friend request already exist',
  FRIEND_REQUEST_NOT_FOUND: 'Friend request not found',
  NOT_AUTHORIZED_TO_ACCEPT_REQUEST: 'Not authorized to accept this request',
  NOT_AUTHORIZED_TO_REJECT_REQUEST: 'Not authorized to reject this request',
  NOT_AUTHORIZED_TO_CANCEL_REQUEST: 'Not authorized to cancel this request',
  REQUEST_IS_NO_LONGER_VALID: 'Request is no longer valid',
  FRIENDSHIP_NOT_FOUND: 'Friendship not found',
} as const;

export const FavoriteErrorMessages = {
  PLACE_NOT_FOUND: 'Place not found',
  PLACE_ALREADY_IN_FAVORITES: 'Place already in favorites',
  FAVORITE_NOT_FOUND: 'Favorite not found',
} as const;

export const PlaceErrorMessages = {
  INVALID_SORT_BY: 'Invalid sortBy value',
  INVALID_SORT_ORDER: 'Invalid sortOrder value',
  EMBEDDING_SERVICE_UNAVAILABLE: 'Embedding service is unavailable',
  PLACE_NOT_FOUND: 'Place not found',
} as const;

export const S3ErrorMessages = {
  FILE_BODY_REQUIRED: 'File body is required',
  FAILED_TO_UPLOAD_FILE: 'Failed to upload file to S3',
} as const;

export const ImageErrorMessages = {
  invalidFileType: (allowedMimeTypes: string[]) =>
    `Invalid file type. Only ${allowedMimeTypes.join(', ')} are allowed`,
} as const;

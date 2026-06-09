import { friendsService } from '@/api/friends';
import SearchBar from '@/components/ui/SearchBar';
import Typography from '@/components/ui/Typography';
import { DEFAULT_AVATAR_SOURCE } from '@/constants/helper';
import { Palette } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { FriendItem, FriendRequestItem, SearchUserItem } from '@/types/api';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FriendsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const me = useAuthStore((s) => s.me);
  const meFetchedAt = useAuthStore((s) => s.meFetchedAt);
  const avatarCacheEpoch = useAuthStore((s) => s.avatarCacheEpoch);

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>(
    params.tab === 'requests' ? 'requests' : 'friends'
  );

  useEffect(() => {
    if (params.tab === 'requests') {
      setActiveTab('requests');
    } else if (params.tab === 'friends') {
      setActiveTab('friends');
    }
  }, [params.tab]);

  // Search Results State
  const [searchUsers, setSearchUsers] = useState<SearchUserItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);

  // Friends List State
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendsPage, setFriendsPage] = useState(1);
  const [hasMoreFriends, setHasMoreFriends] = useState(false);

  // Requests List State
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [requestsPage, setRequestsPage] = useState(1);
  const [hasMoreRequests, setHasMoreRequests] = useState(false);

  // Debounce Search Keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Fetch Search Results
  const loadSearchResults = useCallback(async (page: number, append = false) => {
    if (!debouncedKeyword) return;

    if (!append) setIsSearching(true);
    try {
      const res = await friendsService.searchUsers({
        keyword: debouncedKeyword,
        page,
        limit: 10,
      });

      const fetchedUsers = res.users || [];
      if (append) {
        setSearchUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUsers = fetchedUsers.filter((u) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      } else {
        setSearchUsers(fetchedUsers);
      }

      setSearchPage(page);
      setHasMoreSearch(page < (res.totalPages || 1));
    } catch {
      if (!append) setSearchUsers([]);
    } finally {
      if (!append) setIsSearching(false);
    }
  }, [debouncedKeyword]);

  useEffect(() => {
    if (debouncedKeyword) {
      loadSearchResults(1, false);
    } else {
      setSearchUsers([]);
      setSearchPage(1);
      setHasMoreSearch(false);
    }
  }, [debouncedKeyword, loadSearchResults]);

  const handleLoadMoreSearch = () => {
    if (hasMoreSearch && !isSearching) {
      loadSearchResults(searchPage + 1, true);
    }
  };

  // Fetch Friends List
  const loadFriends = useCallback(async (page: number, append = false) => {
    if (!append) setIsFriendsLoading(true);
    try {
      const res = await friendsService.getFriends({
        page,
        limit: 10,
        sortOrder: 'desc',
        sortBy: 'createdAt',
      });

      const fetchedFriends = res.friends || [];
      if (append) {
        setFriends((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const newFriends = fetchedFriends.filter((f) => !existingIds.has(f.id));
          return [...prev, ...newFriends];
        });
      } else {
        setFriends(fetchedFriends);
      }

      setFriendsPage(page);
      setHasMoreFriends(page < (res.totalPages || 1));
    } catch {
      if (!append) setFriends([]);
    } finally {
      if (!append) setIsFriendsLoading(false);
    }
  }, []);

  // Fetch Requests List
  const loadRequests = useCallback(async (page: number, append = false) => {
    if (!append) setIsRequestsLoading(true);
    try {
      const res = await friendsService.getPendingRequests({
        page,
        limit: 10,
        sortOrder: 'desc',
        sortBy: 'createdAt',
      });

      const fetchedRequests = res.requests || [];
      if (append) {
        setRequests((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newRequests = fetchedRequests.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newRequests];
        });
      } else {
        setRequests(fetchedRequests);
      }

      setRequestsPage(page);
      setHasMoreRequests(page < (res.totalPages || 1));
    } catch {
      if (!append) setRequests([]);
    } finally {
      if (!append) setIsRequestsLoading(false);
    }
  }, []);

  // Initial loads when tabs change
  useEffect(() => {
    if (!debouncedKeyword) {
      if (activeTab === 'friends') {
        loadFriends(1, false);
      } else {
        loadRequests(1, false);
      }
    }
  }, [activeTab, debouncedKeyword, loadFriends, loadRequests]);

  const handleLoadMoreFriends = () => {
    if (hasMoreFriends && !isFriendsLoading) {
      loadFriends(friendsPage + 1, true);
    }
  };

  const handleLoadMoreRequests = () => {
    if (hasMoreRequests && !isRequestsLoading) {
      loadRequests(requestsPage + 1, true);
    }
  };

  // Actions
  const handleRemoveFriend = useCallback(async (friendId: string) => {
    try {
      await friendsService.deleteFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.friendId !== friendId));
    } catch {
      Alert.alert('Error', t('errors.unexpectedError'));
    }
  }, [t]);

  const confirmRemoveFriend = useCallback((friendId: string) => {
    Alert.alert(
      t('friends.removeConfirmTitle'),
      t('friends.removeConfirmMessage'),
      [
        { text: t('friends.cancel'), style: 'cancel' },
        {
          text: t('friends.confirm'),
          style: 'destructive',
          onPress: () => handleRemoveFriend(friendId),
        },
      ]
    );
  }, [t, handleRemoveFriend]);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    try {
      await friendsService.acceptFriendRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Reload friends list in background to sync state
      loadFriends(1, false);
    } catch {
      Alert.alert('Error', t('errors.unexpectedError'));
    }
  }, [t, loadFriends]);

  const handleRejectRequest = useCallback(async (requestId: string) => {
    try {
      await friendsService.rejectFriendRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      Alert.alert('Error', t('errors.unexpectedError'));
    }
  }, [t]);

  const navigateToProfile = useCallback((userId: string) => {
    router.push({
      pathname: '/setting/edit-profile',
      params: { userId },
    } as any);
  }, [router]);

  // Renderers
  const renderSearchItem = useCallback(
    ({ item }: { item: SearchUserItem }) => {
      const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username;

      return (
        <View className="flex-row items-center py-3 border-b border-gray-100">
          <Pressable
            onPress={() => navigateToProfile(item.id)}
            className="flex-row items-center flex-1 gap-3"
          >
            <View className="h-12 w-12 overflow-hidden rounded-full bg-gray-100 border border-black/5">
              <Image
                source={
                  item.pictureUrl
                    ? { uri: (item.id === me?.id ? (meFetchedAt || avatarCacheEpoch) : avatarCacheEpoch) ? `${item.pictureUrl}?t=${item.id === me?.id ? (meFetchedAt || avatarCacheEpoch) : avatarCacheEpoch}` : item.pictureUrl }
                    : DEFAULT_AVATAR_SOURCE
                }
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
            <View className="flex-1">
              <Typography variant="h5" numberOfLines={1} className="text-black">
                {fullName || t('group.unknownUser')}
              </Typography>
              {item.username ? (
                <Typography className="text-gray-500 mt-0.5" numberOfLines={1}>
                  @{item.username}
                </Typography>
              ) : null}
            </View>
          </Pressable>
        </View>
      );
    },
    [t, navigateToProfile, me?.id, meFetchedAt, avatarCacheEpoch]
  );

  const renderFriendItem = useCallback(
    ({ item }: { item: FriendItem }) => {
      const userObj = item.friend;
      if (!userObj) return null;

      const fullName = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.username;

      return (
        <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
          <Pressable
            onPress={() => navigateToProfile(userObj.id)}
            className="flex-row items-center flex-1 gap-3 pr-2"
          >
            <View className="h-12 w-12 overflow-hidden rounded-full bg-gray-100 border border-black/5">
              <Image
                source={
                  userObj.pictureUrl
                    ? { uri: (userObj.id === me?.id ? (meFetchedAt || avatarCacheEpoch) : avatarCacheEpoch) ? `${userObj.pictureUrl}?t=${userObj.id === me?.id ? (meFetchedAt || avatarCacheEpoch) : avatarCacheEpoch}` : userObj.pictureUrl }
                    : DEFAULT_AVATAR_SOURCE
                }
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
            <View className="flex-1">
              <Typography variant="h5" numberOfLines={1} className="text-black">
                {fullName || t('group.unknownUser')}
              </Typography>
              {userObj.username ? (
                <Typography className="text-gray-500 mt-0.5" numberOfLines={1}>
                  @{userObj.username}
                </Typography>
              ) : null}
            </View>
          </Pressable>

          <Pressable
            onPress={() => confirmRemoveFriend(item.friendId)}
            className="p-2 items-center justify-center rounded-full bg-gray-50 active:bg-gray-100"
            hitSlop={8}
          >
            <Trash2 size={18} color="#ff2b2b" strokeWidth={1.8} />
          </Pressable>
        </View>
      );
    },
    [confirmRemoveFriend, t, navigateToProfile, me?.id, meFetchedAt, avatarCacheEpoch]
  );

  const renderRequestItem = useCallback(
    ({ item }: { item: FriendRequestItem }) => {
      const senderObj = item.sender;
      if (!senderObj) return null;

      const fullName = `${senderObj.firstName || ''} ${senderObj.lastName || ''}`.trim() || senderObj.username;

      return (
        <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
          <Pressable
            onPress={() => navigateToProfile(senderObj.id)}
            className="flex-row items-center flex-1 gap-3 pr-2"
          >
            <View className="h-12 w-12 overflow-hidden rounded-full bg-gray-100 border border-black/5">
              <Image
                source={
                  senderObj.pictureUrl
                    ? { uri: (senderObj.id === me?.id ? (meFetchedAt || avatarCacheEpoch) : avatarCacheEpoch) ? `${senderObj.pictureUrl}?t=${senderObj.id === me?.id ? (meFetchedAt || avatarCacheEpoch) : avatarCacheEpoch}` : senderObj.pictureUrl }
                    : DEFAULT_AVATAR_SOURCE
                }
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
            <View className="flex-1">
              <Typography variant="h5" numberOfLines={1} className="text-black">
                {fullName || t('group.unknownUser')}
              </Typography>
              {senderObj.username ? (
                <Typography className="text-gray-500 mt-0.5" numberOfLines={1}>
                  @{senderObj.username}
                </Typography>
              ) : null}
            </View>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => handleAcceptRequest(item.id)}
              className="h-9 px-4 items-center justify-center rounded-full bg-[#3B5BDB]"
            >
              <Typography className="text-white">{t('friends.accept')} </Typography>
            </Pressable>

            <Pressable
              onPress={() => handleRejectRequest(item.id)}
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
            >
              <X size={16} color={Palette.grey} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      );
    },
    [handleAcceptRequest, handleRejectRequest, t, navigateToProfile, me?.id, meFetchedAt, avatarCacheEpoch]
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header Container */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable onPress={() => router.back()} className="p-1" hitSlop={8}>
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
          </Pressable>
          <Typography variant="h4">{t('friends.title')}</Typography>
        </View>

        {/* SearchBar */}
        <SearchBar
          value={keyword}
          onChangeText={setKeyword}
          placeholder={t('friends.searchPlaceholder')}
          showSettings={false}
          showAI={false}
        />
      </View>

      {/* Conditional Layout: Search Results vs Two Tabs */}
      {debouncedKeyword ? (
        <View className="flex-1 px-4 mt-2">
          <Typography variant="h5" className="text-gray-400 mb-2">
            {t('friends.searchResults')}
          </Typography>

          {isSearching && searchUsers.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={Palette.black} size="large" />
            </View>
          ) : (
            <FlatList
              data={searchUsers}
              keyExtractor={(item, index) => item?.id ? `${item.id}-${index}` : String(index)}
              renderItem={renderSearchItem}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMoreSearch}
              onEndReachedThreshold={0.5}
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              ListEmptyComponent={
                !isSearching ? (
                  <View className="items-center py-12">
                    <Typography className="text-gray-400 text-center">
                      {t('friends.noResults')}
                    </Typography>
                  </View>
                ) : null
              }
              ListFooterComponent={
                isSearching && searchUsers.length > 0 ? (
                  <ActivityIndicator color={Palette.black} className="py-4" />
                ) : null
              }
            />
          )}
        </View>
      ) : (
        <View className="flex-1">
          {/* Tabs Navigation */}
          <View className="flex-row border-b border-gray-100 px-4">
            <Pressable
              onPress={() => setActiveTab('friends')}
              className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'friends' ? 'border-[#3B5BDB]' : 'border-transparent'
                }`}
            >
              <Typography
                variant="h5"
                className={activeTab === 'friends' ? '' : 'text-gray-400'}
              >
                {t('friends.tabList').toUpperCase()}
              </Typography>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('requests')}
              className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'requests' ? 'border-[#3B5BDB]' : 'border-transparent'
                }`}
            >
              <Typography
                variant="h5"
                className={activeTab === 'requests' ? '' : 'text-gray-400'}
              >
                {t('friends.tabRequests').toUpperCase()}
              </Typography>
            </Pressable>
          </View>

          {/* Tab Content */}
          <View className="flex-1 px-4 mt-2">
            {activeTab === 'friends' ? (
              isFriendsLoading && friends.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color={Palette.black} size="large" />
                </View>
              ) : (
                <FlatList
                  data={friends}
                  keyExtractor={(item, index) => item?.id ? `${item.id}-${index}` : String(index)}
                  renderItem={renderFriendItem}
                  showsVerticalScrollIndicator={false}
                  onEndReached={handleLoadMoreFriends}
                  onEndReachedThreshold={0.5}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                  ListEmptyComponent={
                    !isFriendsLoading ? (
                      <View className="items-center py-12 px-6">
                        <Typography variant="h5" className="text-gray-400 text-center mb-1">
                          {t('friends.noFriends')}
                        </Typography>
                        <Typography className="text-gray-400 text-center">
                          {t('friends.noFriendsDesc')}
                        </Typography>
                      </View>
                    ) : null
                  }
                  ListFooterComponent={
                    isFriendsLoading && friends.length > 0 ? (
                      <ActivityIndicator color={Palette.black} className="py-4" />
                    ) : null
                  }
                />
              )
            ) : isRequestsLoading && requests.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={Palette.black} size="large" />
              </View>
            ) : (
              <FlatList
                data={requests}
                keyExtractor={(item, index) => item?.id ? `${item.id}-${index}` : String(index)}
                renderItem={renderRequestItem}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMoreRequests}
                onEndReachedThreshold={0.5}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                ListEmptyComponent={
                  !isRequestsLoading ? (
                    <View className="items-center py-12">
                      <Typography className="text-gray-400 text-center">
                        {t('friends.noRequests')}
                      </Typography>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  isRequestsLoading && requests.length > 0 ? (
                    <ActivityIndicator color={Palette.black} className="py-4" />
                  ) : null
                }
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

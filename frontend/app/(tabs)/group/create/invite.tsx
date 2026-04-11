import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { friendsService } from '@/api/friends';
import { groupSessionsService } from '@/api/groupSessions';
import { DEFAULT_AVATAR_SOURCE, DEFAULT_LIMIT, DEFAULT_PAGE } from '@/constants/helper';
import { Palette } from '@/constants/theme';
import type { FriendItem } from '@/types/api';

const getFriendName = (item: FriendItem) => {
  const firstName = item.friend?.firstName?.trim() ?? '';
  const lastName = item.friend?.lastName?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Unknown';
};

export default function GroupInviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { sessionId, shareCode } = useLocalSearchParams<{
    sessionId?: string;
    shareCode?: string;
  }>();

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingMoreFriends, setIsLoadingMoreFriends] = useState(false);
  const [isSubmittingInvites, setIsSubmittingInvites] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [hasMoreFriends, setHasMoreFriends] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const normalizedSessionId = useMemo(() => {
    if (Array.isArray(sessionId)) {
      return sessionId[0];
    }

    return sessionId;
  }, [sessionId]);

  const normalizedShareCode = useMemo(() => {
    if (Array.isArray(shareCode)) {
      return shareCode[0];
    }

    return shareCode;
  }, [shareCode]);

  const appendUniqueFriends = useCallback((prev: FriendItem[], next: FriendItem[]) => {
    const seen = new Set(prev.map((item) => `${item.id}-${item.friendId}-${item.userId}`));
    const filteredNext = next.filter((item) => {
      const stableKey = `${item.id}-${item.friendId}-${item.userId}`;
      if (seen.has(stableKey)) {
        return false;
      }

      seen.add(stableKey);
      return true;
    });

    if (filteredNext.length === 0) {
      return prev;
    }

    return [...prev, ...filteredNext];
  }, []);

  const fetchFriendsPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        setIsLoadingFriends(true);
      } else {
        setIsLoadingMoreFriends(true);
      }

      try {
        const response = await friendsService.getFriends({
          page,
          limit: DEFAULT_LIMIT,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        const nextFriends = response.friends ?? [];
        const totalPages = response.totalPages ?? page;

        setCurrentPage(page);
        setHasMoreFriends(page < totalPages && nextFriends.length > 0);

        if (mode === 'replace') {
          setFriends(nextFriends);
        } else {
          setFriends((prev) => appendUniqueFriends(prev, nextFriends));
        }
      } catch {
        if (mode === 'replace') {
          setFriends([]);
          setHasMoreFriends(false);
        }
      } finally {
        if (mode === 'replace') {
          setIsLoadingFriends(false);
        } else {
          setIsLoadingMoreFriends(false);
        }
      }
    },
    [appendUniqueFriends]
  );

  useEffect(() => {
    void fetchFriendsPage(DEFAULT_PAGE, 'replace');
  }, [fetchFriendsPage]);

  const selectedSet = useMemo(() => new Set(selectedFriendIds), [selectedFriendIds]);

  const uniqueFriends = useMemo(() => friends, [friends]);

  const toggleFriend = useCallback((friendId: string) => {
    setSelectedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      }
      return [...prev, friendId];
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoadingFriends || isLoadingMoreFriends || !hasMoreFriends) {
      return;
    }

    void fetchFriendsPage(currentPage + 1, 'append');
  }, [currentPage, fetchFriendsPage, hasMoreFriends, isLoadingFriends, isLoadingMoreFriends]);

  const handleDone = useCallback(async () => {
    if (!normalizedSessionId || selectedFriendIds.length === 0 || isSubmittingInvites) {
      router.replace('/(tabs)/group');
      return;
    }

    setSubmitError('');
    setIsSubmittingInvites(true);

    try {
      const inviteResults = await Promise.allSettled(
        selectedFriendIds.map((friendId) =>
          groupSessionsService.inviteFriend(normalizedSessionId, friendId)
        )
      );
      const hasFailedInvite = inviteResults.some((result) => result.status === 'rejected');

      if (hasFailedInvite) {
        setSubmitError(t('errors.unexpectedError'));
        return;
      }

      router.replace('/(tabs)/group');
    } finally {
      setIsSubmittingInvites(false);
    }
  }, [isSubmittingInvites, normalizedSessionId, router, selectedFriendIds, t]);

  const renderFriend = useCallback(
    ({ item }: { item: FriendItem }) => {
      const checked = selectedSet.has(item.friendId);
      const friendName = getFriendName(item);
      const avatar = item.friend?.pictureUrl
        ? { uri: item.friend.pictureUrl }
        : DEFAULT_AVATAR_SOURCE;

      return (
        <Pressable
          key={`${item.id}-${item.friendId}-${item.userId}`}
          className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2.5"
          onPress={() => toggleFriend(item.friendId)}
        >
          <View className="flex-row items-center gap-3">
            <Image source={avatar} style={{ width: 36, height: 36, borderRadius: 9999 }} />
            <Typography>{friendName}</Typography>
          </View>
          <Circle size={16} fill={checked ? Palette.black : 'none'} stroke={Palette.black} />
        </Pressable>
      );
    },
    [selectedSet, toggleFriend]
  );

  const keyExtractor = useCallback(
    (item: FriendItem) => `${item.id}-${item.friendId}-${item.userId}`,
    []
  );

  const listHeader = (
    <View>
      <Typography variant="h5">{t('group.recommendFriends')}</Typography>

      {isLoadingFriends ? (
        <Typography className="mt-3 text-gray-500">{t('group.loadingFriends')}</Typography>
      ) : null}

      {!isLoadingFriends && uniqueFriends.length === 0 ? (
        <Typography className="mt-3 text-gray-500">{t('group.noFriends')}</Typography>
      ) : null}

      {submitError ? <Typography className="mt-3 text-red-500">{submitError}</Typography> : null}
    </View>
  );

  const listFooter = (
    <View>
      {isLoadingMoreFriends ? (
        <Typography className="mt-3 text-gray-500">{t('group.loadingFriends')}</Typography>
      ) : null}
      <View style={{ height: insets.bottom + 20 }} />
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
          </Pressable>
          <Typography variant="h4">{t('group.addSessionTitle')}</Typography>
        </View>

        <View className="mt-4">
          <Button
            variant="outline"
            rounded="full"
            className="self-center px-4"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/group/create/share',
                params: {
                  sessionId: normalizedSessionId,
                  shareCode: normalizedShareCode,
                },
              } as any)
            }
          >
            {t('group.inviteByLink')}
          </Button>
        </View>
      </View>

      <FlatList
        data={uniqueFriends}
        keyExtractor={keyExtractor}
        renderItem={renderFriend}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{
          paddingHorizontal: 16,
          rowGap: 8,
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />

      <View
        className="border-t border-[#F0F0F3] bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 100 }}
      >
        <Button className="w-full bg-black" onPress={handleDone} disabled={isSubmittingInvites}>
          {t('button.done')}
        </Button>
      </View>
    </View>
  );
}

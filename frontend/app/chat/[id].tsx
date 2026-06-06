import { chatService } from '@/api/chat';
import ChatView from '@/components/ui/chat/ChatView';
import Typography from '@/components/ui/Typography';
import { Palette } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { getAvatarColor, getInitials, getSenderDisplayName } from '@/utils/chat';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function DirectChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((state) => state.me?.id ?? '');
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const conversationId = Array.isArray(id) ? id[0] : id;

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => chatService.getConversation(conversationId ?? ''),
    enabled: !!conversationId,
    staleTime: 60 * 1000,
  });

  const headerInfo = useMemo(() => {
    if (!conversation) {
      return {
        title: t('chat.defaultTitle'),
        initials: '??',
        color: Palette.white,
      };
    }

    const otherMember =
      conversation.members.find((member) => member.userId !== currentUserId)?.user ?? null;
    const displayName =
      conversation.type === 'DIRECT'
        ? getSenderDisplayName(otherMember)
        : conversation.name?.trim() || t('chat.defaultTitle');

    return {
      title: displayName,
      initials: otherMember
        ? getInitials(otherMember.firstName, otherMember.lastName, otherMember.username)
        : displayName.slice(0, 2).toUpperCase() || '??',
      color: getAvatarColor(otherMember?.id ?? conversation.id),
    };
  }, [conversation, currentUserId]);

  if (!conversationId) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F1F1',
          backgroundColor: 'white',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 4 }}>
          <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
        </Pressable>

        <View className="flex-1 pr-4">
          <Typography variant="h5" numberOfLines={1} className="text-black">
            {isLoading ? t('chat.loading') : headerInfo.title}
          </Typography>
          <Typography className="text-gray-400" numberOfLines={1}>
            {t('chat.directSubtitle')}
          </Typography>
        </View>
      </View>

      <ChatView
        conversationId={conversationId}
        initials={headerInfo.initials}
        color={headerInfo.color}
        style={{ flex: 1 }}
      />
    </View>
  );
}

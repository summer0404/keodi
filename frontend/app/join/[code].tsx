import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { groupSessionsService } from '@/api/groupSessions';
import { useAuthStore } from '@/store/useAuthStore';
import Typography from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';

/**
 * Handles universal share links: https://keodi.vohuka.id.vn/join/{code}
 *
 * When the OS opens this route (via a tapped share link), we:
 *   1. Show a loading indicator while joining the session.
 *   2. Navigate to the session page on success.
 *   3. Show an error with a retry option on failure.
 */
export default function JoinByLinkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);

  const params = useLocalSearchParams<{ code?: string }>();
  const shareCode = Array.isArray(params.code)
    ? params.code[0]
    : params.code ?? '';

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinSession = async () => {
    if (!shareCode) {
      setError(t('errors.invalidLink'));
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const session = await groupSessionsService.joinGroupSession({
        shareCode: shareCode.trim().toUpperCase(),
      });
      // Replace this screen so the user can't navigate back to it
      router.replace(`/(tabs)/group/${session.sessionId}` as any);
    } catch {
      setError(t('errors.unexpectedError'));
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    // If the user is not logged in, redirect to auth then come back
    if (!accessToken) {
      router.replace({
        pathname: '/(auth)/login',
        params: { returnTo: `join/${shareCode}` },
      } as any);
      return;
    }

    void joinSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top }}
    >
      {isJoining ? (
        <>
          <ActivityIndicator size="large" color="#000" />
          <Typography className="mt-4 text-center text-gray-500">
            {t('group.joiningSession')}
          </Typography>
        </>
      ) : error ? (
        <>
          <Typography className="text-center text-red-500">{error}</Typography>
          <Button className="mt-6" onPress={joinSession}>
            {t('button.retry')}
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.replace('/(tabs)/group' as any)}
          >
            {t('button.cancel')}
          </Button>
        </>
      ) : null}
    </View>
  );
}

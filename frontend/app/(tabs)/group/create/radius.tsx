import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  PanResponder,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Minus, Plus, Lightbulb, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { groupSessionsService } from '@/api/groupSessions';
import { DEFAULT_AVATAR_SOURCE } from '@/constants/helper';
import { Palette } from '@/constants/theme';

export default function GroupCreateRadiusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { sessionId, shareCode, guestId } = useLocalSearchParams<{
    sessionId?: string;
    shareCode?: string;
    guestId?: string;
  }>();

  const normalizedSessionId = useMemo(() => {
    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }, [sessionId]);

  const normalizedShareCode = useMemo(() => {
    return Array.isArray(shareCode) ? shareCode[0] : shareCode;
  }, [shareCode]);

  const normalizedGuestId = useMemo(() => {
    return Array.isArray(guestId) ? guestId[0] : guestId;
  }, [guestId]);

  const [radius, setRadius] = useState<number>(5.0);
  const [inputValue, setInputValue] = useState<string>('5.0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const lastRadiusRef = useRef<number>(5.0);
  const initialSize = 120 + ((5.0 - 0.1) / 99.9) * 200;
  const radiusSizeAnim = useRef(new Animated.Value(initialSize)).current;

  const updateRadiusValue = (newRadius: number) => {
    // Restrict range between 0.1 and 100.0 km
    const clamped = Math.max(0.1, Math.min(100.0, Number(newRadius.toFixed(1))));
    
    const newSize = 120 + ((clamped - 0.1) / 99.9) * 200;
    Animated.spring(radiusSizeAnim, {
      toValue: newSize,
      friction: 7,
      tension: 60,
      useNativeDriver: false,
    }).start();

    lastRadiusRef.current = clamped;
    setRadius(clamped);
    setInputValue(clamped.toFixed(1));
  };

  const handleDecrease = () => {
    updateRadiusValue(radius - 0.5);
  };

  const handleIncrease = () => {
    updateRadiusValue(radius + 0.5);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      setRadius(parsed);
      lastRadiusRef.current = parsed;
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0.1) {
      updateRadiusValue(0.1);
    } else if (parsed > 100.0) {
      updateRadiusValue(100.0);
    } else {
      updateRadiusValue(parsed);
    }
  };

  // Custom PanResponder to allow users to drag the top handle to dynamically adjust the radius
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
      },
      onPanResponderMove: (_, gestureState) => {
        // Dragging up (negative dy) increases radius, dragging down (positive dy) decreases radius
        const delta = -gestureState.dy / 2;
        const potentialRadius = lastRadiusRef.current + delta;
        const clamped = Math.max(0.1, Math.min(100.0, Number(potentialRadius.toFixed(1))));
        setRadius(clamped);
        setInputValue(clamped.toFixed(1));
        
        const newSize = 120 + ((clamped - 0.1) / 99.9) * 200;
        radiusSizeAnim.setValue(newSize);
      },
      onPanResponderRelease: () => {
        // Finalize state on release — read from ref to avoid stale closure
        const finalRadius = lastRadiusRef.current;
        const newSize = 120 + ((finalRadius - 0.1) / 99.9) * 200;
        Animated.spring(radiusSizeAnim, {
          toValue: newSize,
          friction: 7,
          tension: 60,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleContinue = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (normalizedSessionId) {
        await groupSessionsService.updateRecommendationRadius(normalizedSessionId, {
          guestId: normalizedGuestId,
          searchRadius: radius,
        });
      }
    } catch {
      // Keep existing flow smooth even if update fails
    } finally {
      setIsSubmitting(false);
      // Flow directs next to invite friends screen
      router.push({
        pathname: '/(tabs)/group/create/invite',
        params: {
          sessionId: normalizedSessionId,
          shareCode: normalizedShareCode,
        },
      } as any);
    }
  };

  const mockAvatars = [
    { id: '1', top: '15%', left: '10%', source: require('@/assets/images/ava1.jpg') },
    { id: '2', top: '22%', right: '12%', source: require('@/assets/images/ava2.jpg') },
    { id: '3', bottom: '8%', left: '46%', source: require('@/assets/images/ava3.jpg') },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      {/* Top Header Bar */}
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
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title & Subtitle */}
        <View className="mt-1 items-center">
          <Typography variant="h4" className="text-center">
            {t('group.selectRadiusTitle')}
          </Typography>
          <Typography className="mt-1 text-center text-[#6B7280] leading-5 px-4">
            {t('group.selectRadiusSubtitle')}
          </Typography>
        </View>

        {/* Radius Input Box Container */}
        <View
          className="mt-4 flex-row items-center justify-between rounded-2xl border border-[#E8E8EC] bg-white p-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Typography variant="h5">
            {t('group.radiusLabel')}
          </Typography>

          <View className="flex-row items-center gap-2">
            <View className="w-24 h-10 items-center justify-center rounded-xl border border-[#E8E8EC] bg-[#F9FAFB] px-2">
              <TextInput
                value={inputValue}
                onChangeText={handleInputChange}
                onBlur={handleInputBlur}
                keyboardType="numeric"
                returnKeyType="done"
                selectTextOnFocus
                className="w-full text-center"
                style={{ padding: 0 }}
              />
            </View>
            <Typography className="text-[#6B7280]">km</Typography>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handleDecrease}
              className="h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8EC] bg-white active:bg-gray-50"
            >
              <Minus size={18} color={Palette.black} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={handleIncrease}
              className="h-10 w-10 items-center justify-center rounded-xl border border-[#E8E8EC] bg-white active:bg-gray-50"
            >
              <Plus size={18} color={Palette.black} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Dynamic Simulated Midpoint Map Representation */}
        <View className="mt-4 w-full h-[320px] rounded-3xl overflow-hidden border border-[#E2E8F0] relative justify-center items-center">
          {/* Subtle custom background pattern mimicking a dynamic light-styled map */}
          <Image 
            source={require('@/assets/images/map.png')} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.4 }} 
            contentFit="cover" 
          />

          {/* Scalable Radius Area Circle */}
          <Animated.View
            style={{
              width: radiusSizeAnim,
              height: radiusSizeAnim,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              position: 'absolute',
              alignItems: 'center',
            }}
          >
            {/* Top draggable pill handle attached to circumference */}
            <View
              {...panResponder.panHandlers}
              className="absolute -top-4 items-center justify-center"
              style={{ zIndex: 20 }}
            >
              <View
                className="bg-[#3B82F6] px-3 py-1 rounded-full items-center justify-center shadow-md"
                style={{ elevation: 4 }}
              >
                <Typography variant="caption" className="text-white">
                  {radius.toFixed(1)} km
                </Typography>
              </View>
              {/* Outer dot anchor */}
              <View className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#3B82F6] -mt-1" />
            </View>
          </Animated.View>

          {/* 3 Peer Avatars representing participants */}
          {mockAvatars.map((avatar) => (
            <View
              key={avatar.id}
              style={{
                position: 'absolute',
                top: avatar.top as any,
                left: avatar.left as any,
                right: avatar.right as any,
                bottom: avatar.bottom as any,
                zIndex: 5,
              }}
              className="rounded-full border-2 border-white shadow-md bg-white overflow-hidden"
            >
              <Image source={avatar.source} style={{ width: 44, height: 44 }} contentFit="cover" />
            </View>
          ))}

          {/* Center Midpoint Highlight Container */}
          <View className="items-center justify-center" style={{ zIndex: 10 }}>
            {/* Pulsing visual anchor back shadow */}
            <View className="absolute w-12 h-12 rounded-full bg-blue-500/20 animate-pulse" />
            <MapPin size={36} color="#3B82F6" fill="#3B82F6" />

            <View
              className="mt-1 bg-white px-3 py-1 rounded-full border border-[#E8E8EC] shadow-sm"
              style={{ elevation: 3 }}
            >
              <Typography variant="h5">
                {t('group.midpointLabel', 'Điểm chính giữa')}
              </Typography>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Bottom Action Footer Container */}
      <View
        className="border-t border-[#F0F0F3] bg-white px-4 pt-3"
        style={{
          paddingBottom: insets.bottom + 12,
          marginBottom: 72,
          backgroundColor: 'white',
        }}
      >
        <Button className="w-full bg-black" disabled={isSubmitting} onPress={handleContinue}>
          {isSubmitting ? `${t('group.continue')}...` : t('group.continue')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

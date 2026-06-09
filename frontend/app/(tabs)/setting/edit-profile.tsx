import { authService } from '@/api/auth';
import { chatService } from '@/api/chat';
import { friendsService } from '@/api/friends';
import { userService } from '@/api/user';
import { Button } from '@/components/ui/Button';
import { ThreadsDatePicker } from '@/components/ui/DatePicker';
import Typography from '@/components/ui/Typography';
import {
  DEFAULT_AVATAR_SOURCE,
  MAX_AVATAR_FILE_BYTES,
  normalizeNullable,
  parseDateForPicker,
  sanitizeUsername,
  toApiDate,
  toComparableDate,
  toDisplayDate,
} from '@/constants/helper';
import { Palette } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  AuthMeResponse,
  OtherUserProfile,
  UpdatePictureRequest,
  UpdateUserProfileRequest,
} from '@/types/api';
import axios from 'axios';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type TFunction } from 'i18next';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock,
  Eye,
  EyeClosed,
  MessageCircle,
  UserCheck,
  UserRoundPlus,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const createEditProfileSchema = (t: TFunction) =>
  z
    .object({
      username: z
        .string()
        .optional()
        .refine((value) => !value || value.length >= 3, {
          message: t('errors.usernameMin'),
        })
        .refine((value) => !value || value.length <= 20, {
          message: t('errors.usernameMax'),
        })
        .refine((value) => !value || /^[a-z0-9._]+$/.test(value), {
          message: t('errors.usernameInvalid'),
        })
        .refine((value) => !value || !/^\d+$/.test(value), {
          message: t('errors.usernameNotAllNumbers'),
        }),
      phoneNumber: z
        .string()
        .optional()
        .refine((value) => !value || value.length <= 12, {
          message: t('errors.phoneNumberMax'),
        }),
      dateOfBirth: z
        .string()
        .optional()
        .refine((value) => !value || toApiDate(value) !== null, {
          message: t('errors.dateOfBirthFormat'),
        }),
      newPassword: z.string().optional(),
      confirmNewPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const nextPassword = data.newPassword?.trim() ?? '';
      const nextConfirm = data.confirmNewPassword?.trim() ?? '';

      if (!nextPassword && !nextConfirm) {
        return;
      }

      if (!nextPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newPassword'],
          message: t('errors.newPasswordRequired'),
        });
      }

      if (!nextConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmNewPassword'],
          message: t('errors.confirmPasswordRequired'),
        });
      }

      if (nextPassword) {
        if (nextPassword.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newPassword'],
            message: t('errors.passwordMin'),
          });
        }

        if (
          !/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).+$/.test(nextPassword)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newPassword'],
            message: t('errors.passwordComplex'),
          });
        }
      }

      if (nextPassword && nextConfirm && nextPassword !== nextConfirm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmNewPassword'],
          message: t('errors.passwordMatch'),
        });
      }
    });

type EditProfileValidationErrors = Partial<
  Record<'username' | 'phoneNumber' | 'dateOfBirth' | 'newPassword' | 'confirmNewPassword', string>
>;

export default function EditProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const insets = useSafeAreaInsets();
  const horizontalPadding = 16;
  const accessToken = useAuthStore(
    (state: ReturnType<typeof useAuthStore.getState>) => state.accessToken
  );
  const me = useAuthStore((state: ReturnType<typeof useAuthStore.getState>) => state.me);
  const isViewOnly = !!userId && userId !== me?.id;
  const fetchMe = useAuthStore((state: ReturnType<typeof useAuthStore.getState>) => state.fetchMe);
  const setMe = useAuthStore((state: ReturnType<typeof useAuthStore.getState>) => state.setMe);
  const setPostLogoutNoticeKey = useAuthStore(
    (state: ReturnType<typeof useAuthStore.getState>) => state.setPostLogoutNoticeKey
  );
  const successScale = useRef(new Animated.Value(1)).current;
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<EditProfileValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const [initialProfile, setInitialProfile] = useState<AuthMeResponse | null>(null);
  const [otherProfile, setOtherProfile] = useState<OtherUserProfile | null>(null);
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [isCancellingFriendRequest, setIsCancellingFriendRequest] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [avatarSource, setAvatarSource] = useState<ImageSourcePropType>(DEFAULT_AVATAR_SOURCE);
  const [avatarFile, setAvatarFile] = useState<UpdatePictureRequest | null>(null);
  const { t } = useTranslation();

  const initialDate = useMemo(() => parseDateForPicker(dateOfBirth), [dateOfBirth]);
  const editProfileSchema = useMemo(() => createEditProfileSchema(t), [t]);

  const resetSubmitFeedback = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    successScale.stopAnimation();
    successScale.setValue(1);
    setIsSubmitSuccess(false);
  };

  useEffect(() => {
    return () => {
      resetSubmitFeedback();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const profile = isViewOnly
          ? await userService.getUserProfile(userId!)
          : await fetchMe({ force: true });

        if (!mounted || !profile) return;

        if (isViewOnly) {
          setOtherProfile(profile as OtherUserProfile);
        }
        setInitialProfile(profile as AuthMeResponse);
        setUsername(profile.username ?? '');
        setEmail(profile.email ?? '');
        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setPhoneNumber(profile.phoneNumber ?? '');
        setDateOfBirth(toDisplayDate(profile.dateOfBirth));
        setAvatarSource(profile.pictureUrl ? { uri: profile.pictureUrl } : DEFAULT_AVATAR_SOURCE);
      } finally {
        if (mounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [fetchMe, userId, isViewOnly]);

  const handleAddFriend = async () => {
    if (!userId || !otherProfile?.canSendFriendRequest) return;
    setIsSendingFriendRequest(true);
    try {
      const result = await friendsService.sendFriendRequest({ receiverId: userId });
      setOtherProfile((prev) =>
        prev
          ? {
              ...prev,
              hasPendingRequest: true,
              pendingRequestId: result.id,
              canSendFriendRequest: false,
            }
          : prev
      );
    } catch {
      Alert.alert('Error', t('errors.unexpectedError'));
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    const requestId = otherProfile?.pendingRequestId;
    if (!requestId) return;
    setIsCancellingFriendRequest(true);
    try {
      await friendsService.cancelFriendRequest(requestId);
      setOtherProfile((prev) =>
        prev
          ? {
              ...prev,
              hasPendingRequest: false,
              pendingRequestId: null,
              canSendFriendRequest: true,
            }
          : prev
      );
    } catch {
      Alert.alert('Error', t('errors.unexpectedError'));
    } finally {
      setIsCancellingFriendRequest(false);
    }
  };

  const handleOpenDirectChat = async () => {
    if (!userId || !otherProfile?.isFriend || isOpeningChat) return;

    setIsOpeningChat(true);
    try {
      const conversation = await chatService.createConversation({
        type: 'DIRECT',
        memberIds: [userId],
      });

      router.push({
        pathname: '/chat/[id]',
        params: { id: conversation.id },
      } as any);
    } catch {
      Alert.alert('Error', t('errors.unexpectedError'));
    } finally {
      setIsOpeningChat(false);
    }
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Please allow photo library access to change your avatar.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1.0,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets[0];
    if (!selected.uri) {
      setAvatarError(t('errors.imageUnableToRead'));
      return;
    }

    if (selected.fileSize && selected.fileSize > MAX_AVATAR_FILE_BYTES) {
      setAvatarError(t('errors.imageSize50MB'));
      return;
    }

    setAvatarError('');
    setAvatarSource({ uri: selected.uri });

    const mime = selected.mimeType ?? 'image/jpeg';
    const extension = mime.split('/')[1] ?? 'jpg';
    const fileName = selected.fileName ?? `avatar.${extension}`;

    setAvatarFile({
      uri: selected.uri,
      name: fileName,
      type: mime,
    });
  };

  const handleDateInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length <= 2) {
      setDateOfBirth(cleaned);
      return;
    }

    if (cleaned.length <= 4) {
      setDateOfBirth(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
      return;
    }

    setDateOfBirth(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`);
  };

  const handleDateConfirm = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    setDateOfBirth(`${day}/${month}/${year}`);
    setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    if (!initialProfile) return;

    if (isSubmitting || isSubmitSuccess) return;

    const trimmedUsername = username.trim();
    const normalizedFirstName = normalizeNullable(firstName);
    const normalizedLastName = normalizeNullable(lastName);
    const normalizedPhone = normalizeNullable(phoneNumber);
    const nextPassword = newPassword.trim();
    const nextConfirmPassword = confirmNewPassword.trim();
    setSubmitError('');
    setAvatarError('');

    const normalizedDob = dateOfBirth.trim().length === 0 ? null : toApiDate(dateOfBirth);

    const profilePayload: UpdateUserProfileRequest = {};

    if ((initialProfile.firstName ?? null) !== normalizedFirstName) {
      profilePayload.firstName = normalizedFirstName;
    }

    if ((initialProfile.lastName ?? null) !== normalizedLastName) {
      profilePayload.lastName = normalizedLastName;
    }

    if ((initialProfile.phoneNumber ?? null) !== normalizedPhone) {
      profilePayload.phoneNumber = normalizedPhone;
    }

    if (toComparableDate(initialProfile.dateOfBirth) !== normalizedDob) {
      profilePayload.dateOfBirth = normalizedDob;
    }

    const shouldUpdateUsername = trimmedUsername !== (initialProfile.username ?? '');
    const shouldUpdateProfile = Object.keys(profilePayload).length > 0;
    const shouldUpdatePicture = !!avatarFile;
    const shouldUpdatePassword = nextPassword.length > 0 || nextConfirmPassword.length > 0;
    const didUpdate =
      shouldUpdateUsername || shouldUpdateProfile || shouldUpdatePicture || shouldUpdatePassword;

    const validation = editProfileSchema.safeParse({
      username: shouldUpdateUsername ? trimmedUsername : undefined,
      phoneNumber: normalizedPhone ?? undefined,
      dateOfBirth: dateOfBirth.trim().length > 0 ? dateOfBirth : undefined,
      newPassword: shouldUpdatePassword ? nextPassword : undefined,
      confirmNewPassword: shouldUpdatePassword ? nextConfirmPassword : undefined,
    });

    if (!validation.success) {
      const nextErrors: EditProfileValidationErrors = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0];
        if (
          key === 'username' ||
          key === 'phoneNumber' ||
          key === 'dateOfBirth' ||
          key === 'newPassword' ||
          key === 'confirmNewPassword'
        ) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    if (!didUpdate) {
      resetSubmitFeedback();
      router.replace('/(tabs)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Sequential update keeps errors easier to trace and avoids partial race conditions.
      if (shouldUpdateProfile) {
        await userService.updateProfile(profilePayload);
      }

      if (shouldUpdatePicture && avatarFile) {
        try {
          await userService.updatePicture(avatarFile);
        } catch (picError) {
          if (axios.isAxiosError(picError)) {
            const statusCode = picError.response?.status;
            if (statusCode === 413) {
              setAvatarError(t('errors.imageTooLarge'));
            } else if (statusCode === 422) {
              setAvatarError(t('errors.invalidImageFormat'));
            } else {
              setAvatarError(t('errors.unableToUpdateProfile'));
            }
          } else {
            setAvatarError(t('errors.unableToUpdateProfile'));
          }
          setIsSubmitting(false);
          return;
        }
      }

      if (shouldUpdatePassword) {
        if (!accessToken) {
          setFieldErrors({ newPassword: 'Missing access token. Please login again.' });
          return;
        }

        await authService.resetPassword({ newPassword: nextPassword }, accessToken);
      }

      if (shouldUpdateUsername) {
        await userService.updateUsername({ username: trimmedUsername });
        setPostLogoutNoticeKey('auth.usernameChangedReloginNotice');
      }

      // Only refresh profile if there were actual changes
      if (didUpdate && !shouldUpdateUsername) {
        const refreshedProfile = await fetchMe({ force: true });
        if (!refreshedProfile) {
          setSubmitError(t('errors.unableToUpdateProfile'));
          return;
        }
        // console.log('[editProfile] refreshedProfile after update:', {
        //   pictureUrl: refreshedProfile.pictureUrl,
        //   username: refreshedProfile.username,
        //   firstName: refreshedProfile.firstName,
        // });
        setInitialProfile(refreshedProfile);
        setUsername(refreshedProfile.username ?? '');
        setEmail(refreshedProfile.email ?? '');
        setFirstName(refreshedProfile.firstName ?? '');
        setLastName(refreshedProfile.lastName ?? '');
        setPhoneNumber(refreshedProfile.phoneNumber ?? '');
        setDateOfBirth(toDisplayDate(refreshedProfile.dateOfBirth));
        setAvatarSource(
          refreshedProfile.pictureUrl ? { uri: refreshedProfile.pictureUrl } : DEFAULT_AVATAR_SOURCE
        );
        setAvatarFile(null);
        setMe(refreshedProfile);
      }

      setIsSubmitSuccess(true);
      Animated.sequence([
        Animated.timing(successScale, {
          toValue: 1.06,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();

      successTimeoutRef.current = setTimeout(() => {
        resetSubmitFeedback();
        if (shouldUpdateUsername) {
          router.replace('/(auth)/login');
          return;
        }
        router.replace('/(tabs)');
      }, 1000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseMessage = (error.response?.data as { message?: string })?.message ?? '';

        if (
          statusCode === 400 &&
          responseMessage.includes('Phone number must not exceed 12 characters')
        ) {
          setFieldErrors((prev) => ({
            ...prev,
            phoneNumber: t('errors.phoneNumberMax'),
          }));
          return;
        }

        if (statusCode === 400 && responseMessage.includes('Username already used')) {
          setFieldErrors((prev) => ({ ...prev, username: t('errors.usernameExists') }));
          return;
        }

        if (statusCode === 413) {
          setAvatarError(t('errors.imageTooLarge'));
          return;
        }

        if (statusCode === 422) {
          setAvatarError(t('errors.invalidImageFormat'));
          return;
        }
      }

      setSubmitError(t('errors.unableToUpdateProfile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        keyboardShouldPersistTaps="handled"
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 12,
        }}
      >
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2} />
          </Pressable>
          <Typography variant="h4">
            {isViewOnly ? t('home.profile') : t('home.editProfile')}
          </Typography>
        </View>

        {isLoadingProfile ? (
          <View className="items-center py-10">
            <ActivityIndicator color={Palette.black} />
          </View>
        ) : (
          <>
            <View className="mb-6 items-center">
              <View className="h-40 w-40 overflow-hidden rounded-full">
                <Image
                  source={
                    avatarSource && typeof avatarSource === 'object' && 'uri' in avatarSource
                      ? { uri: `${avatarSource.uri}?t=${Date.now()}` }
                      : avatarSource
                  }
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>

              {!isViewOnly && (
                <Pressable
                  onPress={handlePickAvatar}
                  className="-mt-6 ml-24 h-10 w-10 items-center justify-center rounded-full border border-[#d6d6d6] bg-white"
                  style={{ elevation: 2 }}
                >
                  <Camera size={18} color={Palette.black} strokeWidth={2} />
                </Pressable>
              )}

              {avatarError ? (
                <Typography className="mt-4 text-red-500 leading-4 text-center px-4">
                  {avatarError}
                </Typography>
              ) : null}

              {!isViewOnly && (
                <View className="mt-4 w-full items-center">
                  <Button
                    onPress={() => router.push('/setting/friends' as any)}
                    className="w-2/3 border py-2 px-6 shadow-md gap-2"
                    rounded="md"
                  >
                    <UserRoundPlus size={18} color={Palette.white} strokeWidth={2} />
                    {t('friends.alreadyFriends').toUpperCase()}
                  </Button>
                </View>
              )}

              {isViewOnly && otherProfile && (
                <View className="mt-4 w-full items-center">
                  {otherProfile.isFriend ? (
                    <View className="w-full flex-row items-center justify-center items-center gap-3">
                      <Button
                        disabled
                        className="flex-1 border py-2 px-6 shadow-md gap-2"
                        rounded="md"
                      >
                        <UserCheck size={18} color={Palette.white} strokeWidth={2} />
                        {t('friends.alreadyFriends').toUpperCase()}
                      </Button>

                      <Button
                        onPress={handleOpenDirectChat}
                        disabled={isOpeningChat}
                        className="flex-1 border py-2 px-6 shadow-md gap-2 bg-[#0E0E0E]"
                        rounded="md"
                      >
                        {isOpeningChat ? (
                          <ActivityIndicator size="small" color={Palette.white} />
                        ) : (
                          <MessageCircle size={18} color={Palette.white} strokeWidth={2} />
                        )}
                        {t('friends.sendMessage').toUpperCase()}
                      </Button>
                    </View>
                  ) : otherProfile.hasPendingRequest ? (
                    <Button
                      onPress={
                        otherProfile.pendingRequestId ? handleCancelFriendRequest : undefined
                      }
                      disabled={isCancellingFriendRequest || !otherProfile.pendingRequestId}
                      className="w-2/3 border py-2 px-6 shadow-md gap-2"
                      rounded="md"
                    >
                      {isCancellingFriendRequest ? (
                        <ActivityIndicator size="small" color={Palette.white} />
                      ) : (
                        <Clock size={18} color={Palette.white} strokeWidth={2} />
                      )}
                      {t('friends.requested').toUpperCase()}
                    </Button>
                  ) : otherProfile.canSendFriendRequest ? (
                    <Button
                      onPress={handleAddFriend}
                      disabled={isSendingFriendRequest}
                      className="w-2/3 border py-2 px-6 shadow-md gap-2"
                      rounded="md"
                    >
                      {isSendingFriendRequest ? (
                        <ActivityIndicator size="small" color={Palette.white} />
                      ) : (
                        <UserRoundPlus size={18} color={Palette.white} strokeWidth={2} />
                      )}
                      {t('friends.add').toUpperCase()}
                    </Button>
                  ) : null}
                </View>
              )}
            </View>

            <View className="gap-3">
              <View>
                <Typography variant="h5" className="mb-2 text-black">
                  {t('auth.username')}
                </Typography>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(sanitizeUsername(text));
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  className="rounded-xl border border-black/15 bg-white px-4 py-3 text-black"
                  autoCapitalize="none"
                  editable={!isViewOnly}
                />
                {fieldErrors.username ? (
                  <Typography className="text-red-500 mt-1 ml-1 leading-4">
                    {fieldErrors.username}
                  </Typography>
                ) : null}
              </View>

              {!isViewOnly && (
                <View>
                  <Typography variant="h5" className="mb-2 text-black">
                    {t('auth.email')}
                  </Typography>
                  <TextInput
                    value={email}
                    editable={false}
                    className="rounded-xl border border-black/15 bg-[#f6f6f6] px-4 py-3 text-[#6b7280]"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Typography variant="h5" className="mb-2 text-black">
                    {t('home.firstName')}
                  </Typography>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    className="rounded-xl border border-black/15 bg-white px-4 py-3 text-black"
                    editable={!isViewOnly}
                  />
                </View>

                <View className="flex-1">
                  <Typography variant="h5" className="mb-2 text-black">
                    {t('home.lastName')}
                  </Typography>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    className="rounded-xl border border-black/15 bg-white px-4 py-3 text-black"
                    editable={!isViewOnly}
                  />
                </View>
              </View>

              {!isViewOnly && (
                <View>
                  <Typography variant="h5" className="mb-2 text-black">
                    {t('home.phone')}
                  </Typography>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text);
                      if (fieldErrors.phoneNumber) {
                        setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                      }
                    }}
                    className="rounded-xl border border-black/15 bg-white px-4 py-3 text-black"
                    keyboardType="phone-pad"
                    editable={!isViewOnly}
                  />
                  {fieldErrors.phoneNumber ? (
                    <Typography className="text-red-500 mt-1 ml-1 leading-4">
                      {fieldErrors.phoneNumber}
                    </Typography>
                  ) : null}
                </View>
              )}

              <View>
                <Typography variant="h5" className="mb-2 text-black">
                  {t('home.dateOfBirth')}
                </Typography>
                <View className="flex-row items-center rounded-xl border border-black/15 bg-white px-4 py-1">
                  <TextInput
                    value={dateOfBirth}
                    onChangeText={(text) => {
                      handleDateInputChange(text);
                      if (fieldErrors.dateOfBirth) {
                        setFieldErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                      }
                    }}
                    className="flex-1 py-2 text-black px-0"
                    keyboardType="number-pad"
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={Palette.grey}
                    maxLength={10}
                    editable={!isViewOnly}
                  />
                  <Pressable onPress={() => !isViewOnly && setShowDatePicker(true)}>
                    <CalendarDays size={18} color={Palette.grey} strokeWidth={2} />
                  </Pressable>
                </View>
                {fieldErrors.dateOfBirth ? (
                  <Typography className="text-red-500 mt-1 ml-1 leading-4">
                    {fieldErrors.dateOfBirth}
                  </Typography>
                ) : null}
              </View>

              {!isViewOnly && (
                <>
                  <View>
                    <Typography variant="h5" className="mb-2 text-black">
                      {t('auth.newPasswordTitle')}
                    </Typography>
                    <View className="rounded-xl border border-black/15 bg-white px-4 flex-row items-center justify-between">
                      <TextInput
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          if (fieldErrors.newPassword) {
                            setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                          }
                        }}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="flex-1 py-3 text-black"
                      />
                      <Pressable onPress={() => setShowNewPassword((prev) => !prev)}>
                        {showNewPassword ? (
                          <EyeClosed size={18} color={Palette.grey} />
                        ) : (
                          <Eye size={18} color={Palette.grey} />
                        )}
                      </Pressable>
                    </View>
                    {fieldErrors.newPassword ? (
                      <Typography className="text-red-500 mt-1 ml-1 leading-4">
                        {fieldErrors.newPassword}
                      </Typography>
                    ) : null}
                  </View>

                  <View>
                    <Typography variant="h5" className="mb-2 text-black">
                      {t('auth.confirmPassword')}
                    </Typography>
                    <View className="rounded-xl border border-black/15 bg-white px-4 flex-row items-center justify-between">
                      <TextInput
                        value={confirmNewPassword}
                        onChangeText={(text) => {
                          setConfirmNewPassword(text);
                          if (fieldErrors.confirmNewPassword) {
                            setFieldErrors((prev) => ({ ...prev, confirmNewPassword: undefined }));
                          }
                        }}
                        secureTextEntry={!showConfirmNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="flex-1 py-3 text-black"
                      />
                      <Pressable onPress={() => setShowConfirmNewPassword((prev) => !prev)}>
                        {showConfirmNewPassword ? (
                          <EyeClosed size={18} color={Palette.grey} />
                        ) : (
                          <Eye size={18} color={Palette.grey} />
                        )}
                      </Pressable>
                    </View>
                    {fieldErrors.confirmNewPassword ? (
                      <Typography className="text-red-500 mt-1 ml-1 leading-4">
                        {fieldErrors.confirmNewPassword}
                      </Typography>
                    ) : null}
                  </View>
                </>
              )}
            </View>

            {submitError ? (
              <Typography className="mt-2 text-red-500 mb-2 leading-4">{submitError}</Typography>
            ) : null}

            {!isViewOnly && (
              <Animated.View
                style={{
                  transform: [{ scale: successScale }],
                  alignSelf: 'center',
                  width: '66.666667%',
                }}
              >
                <Button
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className={`mt-4 py-3 mb-6 w-full items-center self-center ${
                    isSubmitSuccess ? 'bg-green-500' : ''
                  }`}
                  rounded="xl"
                >
                  {isSubmitSuccess
                    ? t('button.updateSuccess')
                    : isSubmitting
                      ? t('button.updating')
                      : t('button.update')}
                </Button>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <ThreadsDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onDateChange={handleDateConfirm}
        initialDate={initialDate}
        minYear={1900}
        maxYear={new Date().getFullYear()}
        name={t('home.dateOfBirth')}
      />
    </View>
  );
}

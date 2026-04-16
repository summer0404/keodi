import React, { useEffect, useState } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { Clock3, Heart, MapPin, MoveDiagonal, Star, type LucideIcon } from 'lucide-react-native';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import Typography from './Typography';
import { Palette } from '@/constants/theme';
import { getLocalizedLocation } from '@/constants/helper';

const DEFAULT_PLACE_IMAGE = require('@/assets/images/img-cover.webp');

type PlaceCardTag = {
  label: string;
  icon?: LucideIcon;
  active?: boolean;
};

type PlaceCardProps = {
  imageSource: ImageProps['source'];
  title: string;
  rating: number | string;
  distanceLabel?: string;
  fullAddress?: string | null;
  street?: string | null;
  ward?: string | null;
  city?: string | null;
  address?: string;
  openingHours?: string;
  description?: string;
  statusLabel?: string;
  isOpen?: boolean;
  showStatusChip?: boolean;
  defaultFavorite?: boolean;
  tags?: PlaceCardTag[];
  onFavoriteChange?: (isFavorite: boolean) => boolean | void | Promise<boolean | void>;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const iconSize = 16;

export default function PlaceCard({
  imageSource,
  title,
  rating,
  distanceLabel,
  fullAddress,
  street,
  ward,
  city,
  address,
  openingHours,
  description,
  statusLabel,
  isOpen = true,
  showStatusChip = true,
  defaultFavorite = false,
  tags = [],
  onFavoriteChange,
  className,
  style,
}: PlaceCardProps) {
  const { t, i18n } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(defaultFavorite);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [resolvedImageSource, setResolvedImageSource] = useState<ImageProps['source']>(
    imageSource || DEFAULT_PLACE_IMAGE
  );

  useEffect(() => {
    setIsFavorite(defaultFavorite);
  }, [defaultFavorite]);

  useEffect(() => {
    setResolvedImageSource(imageSource || DEFAULT_PLACE_IMAGE);
  }, [imageSource]);

  const fallbackAddress = [
    street?.trim(),
    getLocalizedLocation(ward, city, i18n.language ?? 'en', t),
  ]
    .filter(Boolean)
    .join(', ');

  const addressText = fullAddress?.trim() || fallbackAddress || address?.trim() || '';
  const computedStatusLabel = statusLabel ?? (isOpen ? 'Open' : 'Close');

  const handleFavoritePress = async () => {
    if (isFavoriteLoading) {
      return;
    }

    const previousValue = isFavorite;
    const nextValue = !isFavorite;
    setIsFavorite(nextValue);

    if (!onFavoriteChange) {
      return;
    }

    setIsFavoriteLoading(true);
    try {
      const shouldKeepNextValue = await onFavoriteChange(nextValue);
      if (shouldKeepNextValue === false) {
        setIsFavorite(previousValue);
      }
    } catch {
      setIsFavorite(previousValue);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  return (
    <Card
      className={clsx('overflow-hidden self-center bg-white', className)}
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 6,
          boxShadow: '0px 2px 12px rgba(0,0,0,0.25)',
        },
        style,
      ]}
    >
      {/* Image area — bg-[#E8EAED] giữ placeholder màu xám nhạt khi ảnh chưa load
          transition giúp fade in mượt, tránh flash trắng đột ngột */}
      <View className="relative h-[186px] w-full bg-[#E8EAED]">
        <Image
          source={resolvedImageSource}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200} // fade in 200ms
          onError={() => {
            setResolvedImageSource(DEFAULT_PLACE_IMAGE);
          }}
          recyclingKey={
            // reuse the same image instance for identical sources to optimize memory
            typeof resolvedImageSource === 'object' &&
            resolvedImageSource !== null &&
            'uri' in resolvedImageSource
              ? (resolvedImageSource as { uri: string }).uri
              : 'default'
          }
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute right-4 top-4 h-11 w-11 items-center justify-center rounded-full bg-white"
          disabled={isFavoriteLoading}
          onPress={handleFavoritePress}
        >
          <Heart
            size={21}
            color={isFavorite ? Palette.red : Palette.black}
            fill={isFavorite ? Palette.red : 'transparent'}
            strokeWidth={2.0}
          />
        </Pressable>

        {showStatusChip ? (
          <View
            className={clsx(
              'rounded-full absolute bottom-4 left-4 px-3 py-1.5',
              isOpen ? 'bg-green-500' : 'bg-red-500'
            )}
          >
            <Typography variant="caption-sm" className="font-bold text-white">
              {computedStatusLabel}
            </Typography>
          </View>
        ) : null}
        {distanceLabel && (
          <View className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1.5 flex-row items-center gap-2">
            <MoveDiagonal size={iconSize} color={Palette.black} strokeWidth={2} />

            <Typography variant="caption">{distanceLabel}</Typography>
          </View>
        )}
      </View>

      <View className="px-5 pb-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Typography variant="h4" className="flex-1">
            {title}
          </Typography>
          <View className="flex-row items-center gap-2">
            <Star size={iconSize} color={Palette.star} fill={Palette.star} strokeWidth={2} />
            <Typography variant="h4">{rating}</Typography>
          </View>
        </View>

        {addressText && (
          <View className="mt-3 pr-5 flex-row items-start gap-2">
            <MapPin size={18} color={Palette.black} strokeWidth={2} />
            <Typography variant="caption" className="flex-1">
              {addressText}
            </Typography>
          </View>
        )}

        {openingHours && (
          <View className="mt-3 pr-5 flex-row items-start gap-2">
            <Clock3 size={18} color={Palette.black} strokeWidth={2} />
            <Typography variant="caption" className="flex-1">
              {openingHours}
            </Typography>
          </View>
        )}

        {description && (
          <Typography className="mt-4" numberOfLines={2}>
            {description}
          </Typography>
        )}

        <View className="mt-3 flex-row flex-wrap gap-3">
          {tags.map(({ label, icon: Icon, active }) => (
            <View
              key={label}
              className={clsx(
                'flex-row items-center gap-1 rounded-full border px-3 py-2',
                active ? 'border-black bg-black' : 'border-gray-400 bg-white shadow-md'
              )}
            >
              {Icon ? (
                <Icon size={18} color={active ? Palette.white : Palette.grey} strokeWidth={1.8} />
              ) : null}
              <Typography className={clsx(active ? 'text-white' : '')}>{label}</Typography>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

export type { PlaceCardProps, PlaceCardTag };

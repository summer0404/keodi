import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { useTranslation } from 'react-i18next';

interface AlertScreenProps {
  imageSrc?: ImageSourcePropType;
  heading: string;
  description?: string;
  primaryButtonText: string;
  primaryButtonAction: () => void;
  secondaryButtonText?: string;
  secondaryButtonAction?: () => void;
}

const defaultImage = require('@/assets/images/verifyEmail.png');

export default function AlertScreen({
  imageSrc,
  heading,
  description,
  primaryButtonText,
  primaryButtonAction,
  secondaryButtonText,
  secondaryButtonAction,
}: AlertScreenProps) {
  const { t } = useTranslation();

  return (
    <View className="items-center">
      <Image
        source={imageSrc ?? defaultImage}
        className="w-[400px] h-[200px] mt-6 mb-6"
        resizeMode="contain"
      />
      <Typography variant="h3" className="text-black text-center">
        {t(heading)}
      </Typography>

      {description && (
        <Typography className="text-black/60 text-center mt-2 mb-8">{t(description)}</Typography>
      )}

      <Button className="w-full mt-6" onPress={() => primaryButtonAction()}>
        {t(primaryButtonText)}
      </Button>

      {secondaryButtonText && secondaryButtonAction && (
        <Button
          variant="ghost"
          className="mt-6 items-center"
          onPress={() => secondaryButtonAction?.()}
        >
          <Typography className="text-gray-600">{t(secondaryButtonText)}</Typography>
        </Button>
      )}
    </View>
  );
}

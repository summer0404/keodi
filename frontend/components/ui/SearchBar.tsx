import React from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { Palette } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import Typography from './Typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  onSettingsPress?: () => void;
  onAIPress?: () => void;
  placeholder?: string;
  showSettings?: boolean;
  settingsActive?: boolean;
  showAI?: boolean;
  isAIActive?: boolean;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmitEditing,
  onSettingsPress,
  onAIPress,
  placeholder = 'Search here',
  showSettings = true,
  settingsActive = false,
  showAI = false,
  isAIActive = false,
  autoFocus = false,
}: SearchBarProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center rounded-full bg-gray-100 px-4" style={{ height: 48 }}>
      <Search size={20} color={Palette.grey} strokeWidth={2} />

      <TextInput
        className="ml-3 flex-1 text-base text-black"
        style={{ paddingVertical: 0 }}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={Palette.grey}
        returnKeyType="search"
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {showAI && onAIPress ? (
        <Pressable
          onPress={onAIPress}
          hitSlop={10}
          className={`mr-5 flex-row items-center gap-1.5 rounded-full px-2.5 py-2 ${
            isAIActive ? 'bg-blue-100' : 'bg-gray-200'
          }`}
        >
          <View className="h-4 w-4 items-center justify-center">
            <Sparkles size={12} color={isAIActive ? Palette.blue : Palette.grey} strokeWidth={2} />
          </View>
          <Typography
            className={isAIActive ? 'text-blue-600' : 'text-gray-500'}
            style={[
              { lineHeight: 16 },
              Platform.OS === 'android' ? { includeFontPadding: false } : null,
            ]}
          >
            {t('button.aiMode')}
          </Typography>
        </Pressable>
      ) : null}

      {showSettings && onSettingsPress ? (
        <Pressable onPress={onSettingsPress} hitSlop={8}>
          <SlidersHorizontal
            size={20}
            color={settingsActive ? Palette.blue : Palette.grey}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

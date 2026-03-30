import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { Palette } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  onSettingsPress?: () => void;
  placeholder?: string;
  showSettings?: boolean;
  settingsActive?: boolean;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmitEditing,
  onSettingsPress,
  placeholder = 'Search here',
  showSettings = true,
  settingsActive = false,
  autoFocus = false,
}: SearchBarProps) {
  return (
    <View
      className="flex-row items-center rounded-full bg-[#F5F5F5] px-4"
      style={{ height: 48 }}
    >
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

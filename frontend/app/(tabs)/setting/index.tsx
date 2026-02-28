import Typography from '@/components/ui/Typography';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThreadsDatePicker } from '@/components/ui/DatePicker';
import { useState } from 'react';


export default function SearchResult() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); 
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateConfirm = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    setDateOfBirth(`${day}/${month}/${year}`);
    setShowDatePicker(false);
  };

  const handleDateInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDateOfBirth(formatted);
  };
  
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 96 }} className="px-4">
      {/* list content */}
      {/* <View className="flex-row gap-3">
        <View className="flex-1">
          <Typography className="text-black/60 mb-2">{t('auth.firstName')}</Typography>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            className="rounded-xl border border-black/10 bg-white px-4 text-black"
          />
        </View>
        <View className="flex-1">
          <Typography className="text-black/60 mb-2">{t('auth.lastName')}</Typography>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            className="rounded-xl border border-black/10 bg-white px-4 text-black"
          />
        </View>
      </View> */}

      {/* <View>
        <Typography className="text-black/60 mb-2">{t('auth.dateOfBirth')}</Typography>
        <View className="rounded-xl border border-black/10 bg-white px-4 flex-row items-center justify-between">
          <TextInput
            value={dateOfBirth}
            onChangeText={handleDateInputChange}
            className="flex-1 text-black px-0"
            placeholder="DD/MM/YYYY"
            placeholderTextColor={Palette.grey}
            maxLength={10}
            keyboardType="number-pad"
          />
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Calendar size={18} color={Palette.grey} />
          </Pressable>
        </View>
      </View> */}

      {/* <ThreadsDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onDateChange={handleDateConfirm}
        initialDate={(() => {
          const parts = dateOfBirth.split('/').map(Number);
          if (parts.length === 3 && parts[0] > 0 && parts[1] > 0 && parts[2] > 0) {
            const d = new Date(parts[2], parts[1] - 1, parts[0]);
            return isNaN(d.getTime()) ? new Date() : d;
          }
          return new Date();
        })()}
        minYear={1900}
        maxYear={new Date().getFullYear()}
        name={t('auth.dateOfBirth')}
      /> */}
    </ScrollView>
  );
}
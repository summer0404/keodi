import { Button } from '@/components/ui/Button';
import { View, Text, Modal, Pressable } from 'react-native';
import Typography from '@/components/ui/Typography';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

import React, { useState } from 'react';
import { ThreadsDatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useSettingStore } from '@/store/useSettingStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState('5');
  const { language, setLanguage } = useSettingStore();

  const options = [
    { label: '2 km', value: '2' },
    { label: '5 km', value: '5' },
    { label: '15 km', value: '15' },
    { label: '> 15 km', value: '15plus' },
  ];

  return (
    <View className="flex-1 justify-center items-center p-4">
      <View className="p-4">
        <Select value={range} onChange={(value) => setRange(String(value))} options={options} />
      </View>
      <Button variant="default" onPress={() => setShowPicker(true)}>
        {t('selectDate')}
      </Button>
      <Typography className="mt-4">{t('welcome')}</Typography>
      <Pressable onPress={() => setModalVisible(true)}>
        <Card>
          <CardHeader>
            <CardTitle>Tiêu đề Card</CardTitle>
            <CardDescription>Mô tả ngắn về nội dung của card này.</CardDescription>
          </CardHeader>
          <CardContent>
            <Typography>Đây là nội dung chính bên trong card.</Typography>
          </CardContent>
        </Card>
      </Pressable>

      <Button onPress={() => setLanguage('vi')}>Chuyển tiếng Việt</Button>

      <Button onPress={() => setLanguage('en')}>Switch to English</Button>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, minWidth: 250 }}>
            <Text style={{ fontSize: 18, marginBottom: 16 }}>Đây là Modal!</Text>
            <Button variant="default" onPress={() => setModalVisible(false)}>
              Đóng
            </Button>
          </View>
        </View>
      </Modal>

      <ThreadsDatePicker
        visible={showPicker}
        initialDate={date}
        onClose={() => setShowPicker(false)}
        onDateChange={(newDate) => {
          setDate(newDate);
          console.log('User picked:', newDate);
        }}
      />
    </View>
  );
}

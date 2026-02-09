import React, { useState, useMemo, useEffect } from 'react';
import { View, Modal, Text, TouchableWithoutFeedback } from 'react-native';
import { Button } from './Button';
import { ScrollPicker } from './ScrollPicker';
import { useSettingStore } from '@/store/useSettingStore';

interface ThreadsDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  initialDate?: Date;
}

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_NAMES_VI = [
  'tháng 1',
  'tháng 2',
  'tháng 3',
  'tháng 4',
  'tháng 5',
  'tháng 6',
  'tháng 7',
  'tháng 8',
  'tháng 9',
  'tháng 10',
  'tháng 11',
  'tháng 12',
];

const getMonthName = (monthIndex: number, language: string): string => {
  if (language === 'en') {
    return MONTH_NAMES_EN[monthIndex - 1];
  }
  return MONTH_NAMES_VI[monthIndex - 1];
};

export const ThreadsDatePicker: React.FC<ThreadsDatePickerProps> = ({
  visible,
  onClose,
  onDateChange,
  initialDate = new Date(),
}) => {
  const { language } = useSettingStore();
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());

  // Data generation
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) arr.push(i);
    return arr;
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const days = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const maxDay = new Date(selectedYear, selectedMonth, 0).getDate();
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  }, [selectedMonth, selectedYear]);

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
    onDateChange(date);
    onClose();
  };

  const PICKER_HEIGHT = 200;
  const ITEM_HEIGHT = 40;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0" />
        </TouchableWithoutFeedback>

        <View className="bg-white w-full rounded-t-[24px] px-4 pb-8 shadow-xl">
          {/* Handle bar */}
          <View className="items-center mt-3 mb-2">
            <View className="w-10 h-1 bg-gray-300 rounded-full" />
          </View>

          {/* Title */}
          <View className="items-center mb-6">
            <Text className="text-lg font-bold text-black">Before day:</Text>
          </View>

          {/* --- Date --- */}
          <View className="flex-row justify-center relative mb-6">
            {/* 1. HIGHLIGHT BAR */}
            <View
              className="absolute w-full bg-gray-100 rounded-lg -z-10"
              style={{
                height: ITEM_HEIGHT,
                top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
              }}
            />

            {/* 2. SCROLL PICKER COLUMNS */}
            {/* Day Column */}
            <View className="flex-1">
              <ScrollPicker
                items={days}
                value={selectedDay}
                onValueChange={setSelectedDay}
                height={PICKER_HEIGHT}
                itemHeight={ITEM_HEIGHT}
              />
            </View>

            {/* Month (Hiển thị text "tháng X") */}
            <View className="flex-[1.5]">
              <ScrollPicker
                items={months.map((m) => getMonthName(m, language))}
                value={getMonthName(selectedMonth, language)}
                onValueChange={(val: string) => {
                  const monthIndex =
                    language === 'en'
                      ? MONTH_NAMES_EN.indexOf(val) + 1
                      : MONTH_NAMES_VI.indexOf(val) + 1;
                  setSelectedMonth(monthIndex);
                }}
                height={PICKER_HEIGHT}
                itemHeight={ITEM_HEIGHT}
              />
            </View>

            {/* Year Column */}
            <View className="flex-1">
              <ScrollPicker
                items={years}
                value={selectedYear}
                onValueChange={setSelectedYear}
                height={PICKER_HEIGHT}
                itemHeight={ITEM_HEIGHT}
              />
            </View>
          </View>

          {/* Confirm Button */}
          <Button variant="default" size="lg" rounded="full" onPress={handleConfirm}>
            Confirm
          </Button>
        </View>
      </View>
    </Modal>
  );
};

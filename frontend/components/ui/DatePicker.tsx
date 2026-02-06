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

const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_VI = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

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
  
  // Tách ngày/tháng/năm
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

  // Tính lại số ngày khi tháng/năm thay đổi
  const days = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  // Fix logic: Nếu đang chọn ngày 31 mà đổi sang tháng 2 (có 28 ngày) thì reset về ngày cuối của tháng đó
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

  // Cấu hình kích thước
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

          {/* --- VÙNG CHỌN NGÀY --- */}
          <View className="flex-row justify-center relative mb-6">
            {/* 1. HIGHLIGHT BAR (QUAN TRỌNG NHẤT) */}
            {/* Nằm tuyệt đối ở giữa, đè dưới text */}
            <View
              className="absolute w-full bg-gray-100 rounded-lg -z-10"
              style={{
                height: ITEM_HEIGHT, // Cao bằng 1 dòng text (40)
                top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2, // Căn giữa theo chiều dọc
              }}
            />

            {/* 2. CÁC CỘT SCROLL PICKER */}
            {/* Cột Ngày */}
            <View className="flex-1">
              <ScrollPicker
                items={days}
                value={selectedDay}
                onValueChange={setSelectedDay}
                height={PICKER_HEIGHT}
                itemHeight={ITEM_HEIGHT}
              />
            </View>

            {/* Cột Tháng (Hiển thị text "tháng X") */}
            <View className="flex-[1.5]">
              {/* Custom render hiển thị chữ 'tháng' thì xử lý ở lớp cha hoặc map data string */}
              {/* Ở đây ta truyền mảng số, nhưng UI ScrollPicker có thể sửa để nhận object {label, value} nếu muốn phức tạp hơn. */}
              {/* Cách đơn giản: Map mảng months thành chuỗi 'tháng X' */}
              <ScrollPicker
                items={months.map((m) => getMonthName(m, language))}
                value={getMonthName(selectedMonth, language)}
                onValueChange={(val: string) => {
                  const monthIndex = language === 'en' 
                    ? MONTH_NAMES_EN.indexOf(val) + 1
                    : MONTH_NAMES_VI.indexOf(val) + 1;
                  setSelectedMonth(monthIndex);
                }}
                height={PICKER_HEIGHT}
                itemHeight={ITEM_HEIGHT}
              />
            </View>

            {/* Cột Năm */}
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

          {/* Button Xong */}
          <Button variant="default" size="lg" rounded="full" onPress={handleConfirm}>
            Xong
          </Button>
        </View>
      </View>
    </Modal>
  );
};

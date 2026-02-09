// components/ScrollPicker.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface ScrollPickerProps {
  items: (string | number)[];
  value: string | number;
  onValueChange: (value: any) => void;
  height?: number; 
  itemHeight?: number;
}

export const ScrollPicker: React.FC<ScrollPickerProps> = ({
  items,
  value,
  onValueChange,
  height = 200,
  itemHeight = 40,
}) => {
  const flatListRef = useRef<FlatList>(null);

  //Calculate padding so that first and last items can be centered
  const paddingVertical = (height - itemHeight) / 2;

  // Scroll and snap to the nearest item on scroll end
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);

    if (index >= 0 && index < items.length) {
      onValueChange(items[index]);
    }
  };

  // Auto scroll to the initially selected value
  useEffect(() => {
    const index = items.indexOf(value);
    if (index !== -1 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: index * itemHeight,
          animated: false,
        });
      }, 100);
    }
  }, []);

  return (
    <View style={{ height, width: '100%' }}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight} // create snap effect for each row
        decelerationRate="fast" // fast deceleration for quick stop
        contentContainerStyle={{
          paddingVertical: paddingVertical, // padding to center first and last items
        }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isSelected = item === value;
          return (
            <View style={{ height: itemHeight }} className="justify-center items-center">
              <Text
                className={`text-base font-medium ${isSelected ? 'text-black font-bold' : 'text-gray-400'}`}
              >
                {/* Display format: If number < 10, add leading zero*/}
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

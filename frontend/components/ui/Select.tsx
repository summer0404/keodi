import React, { useState, useRef } from 'react';
import {
  Pressable,
  View,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  LayoutRectangle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import clsx from 'clsx';
import Typography from './Typography';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  dropdownClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  const selected = options.find((o) => o.value === value);

  const handleOpen = () => {
    triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTriggerLayout({ x: pageX, y: pageY, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      {/* Trigger */}
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={handleOpen}
          className={clsx(
            'flex-row items-center justify-between rounded-2xl bg-white px-4 py-3',
            'border border-gray-200',
            className
          )}
        >
          <Typography className="text-black">{selected?.label ?? placeholder}</Typography>

          <ChevronDown size={18} color="#000" />
        </Pressable>
      </View>

      {/* Dropdown Modal */}
      <Modal
        transparent={true}
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View className="flex-1">
            {/* Dropdown Container - positioned based on trigger */}
            {triggerLayout && (
              <TouchableWithoutFeedback>
                <View
                  className={clsx('absolute rounded-2xl bg-white p-2', dropdownClassName)}
                  style={{
                    top: triggerLayout.y + triggerLayout.height + 8, // 8px gap
                    left: triggerLayout.x,
                    width: triggerLayout.width,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.value.toString()}
                    scrollEnabled={false} // disable scroll if options short
                    renderItem={({ item }) => {
                      const isSelected = item.value === value;

                      return (
                        <Pressable
                          onPress={() => {
                            onChange(item.value);
                            setOpen(false);
                          }}
                          className={clsx(
                            'flex-row items-center justify-between px-4 py-3 rounded-xl',
                            isSelected && 'bg-gray-100'
                          )}
                        >
                          <Typography className="text-black">{item.label}</Typography>

                          {isSelected && <Check size={18} color="#000" />}
                        </Pressable>
                      );
                    }}
                  />
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

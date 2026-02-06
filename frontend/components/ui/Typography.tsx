import { Text, type TextProps, type TextStyle } from 'react-native';
import clsx from 'clsx';
import React from 'react';

// Định nghĩa các biến thể theo yêu cầu của bạn
export type TypographyVariant = 'caption' | 'caption-sm' | 'h3' | 'h4' | 'h5';

export interface TypographyProps extends TextProps {
  /**
   * Biến thể kiểu chữ
   * @default "caption"
   */
  variant?: TypographyVariant;
  /**
   * Màu chữ (có thể dùng class tailwind text-color hoặc mã hex qua style)
   */
  className?: string;
  children: React.ReactNode;
}

/**
 * Typography Component cho React Native (NativeWind)
 * * Specs:
 * - Caption: Poppins Regular, 14pt
 * - Caption-sm: Poppins Regular, 12pt
 * - h3: Montserrat SemiBold, 36pt, Letter Spacing: -5%
 * - h4: Montserrat SemiBold, 24pt, Letter Spacing: -5%
 * - h5: Poppins SemiBold, 16pt
 */
const Typography = ({
  variant = 'caption',
  className,
  style,
  children,
  ...props
}: TypographyProps) => {
  // Hàm lấy class styles dựa trên variant
  const getVariantClasses = () => {
    switch (variant) {
      case 'h3':
        // Montserrat SemiBold, 36pt, Spacing -5%
        return 'font-montserrat-semibold text-[36px] tracking-[-0.05em]';

      case 'h4':
        // Montserrat SemiBold, 24pt, Spacing -5%
        return 'font-montserrat-semibold text-[24px] tracking-[-0.05em]';

      case 'h5':
        // Poppins SemiBold, 16pt
        return 'font-montserrat-semibold text-[16px]';

      case 'caption-sm':
        // Poppins Regular, 12pt
        return 'font-montserrat-reg text-[12px]';

      case 'caption':
      default:
        // Poppins Regular, 14pt
        return 'font-montserrat-reg text-[14px]';
    }
  };

  return (
    <Text
      className={clsx(
        'text-black dark:text-white', // Màu mặc định (có thể override)
        getVariantClasses(),
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
};

export default Typography;

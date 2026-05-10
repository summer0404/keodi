import { Text, type TextProps } from 'react-native';
import clsx from 'clsx';
import React from 'react';

export type TypographyVariant = 'caption' | 'caption-sm' | 'h3' | 'h4' | 'h5';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  className?: string;
  children: React.ReactNode;
}

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
        // Montserrat SemiBold, 32pt, Spacing -5%
        return 'font-montserrat-semibold text-[30px] tracking-[-0.05em]';

      case 'h4':
        // Montserrat SemiBold, 24pt, Spacing -5%
        return 'font-montserrat-semibold text-[22px] tracking-[-0.05em]';

      case 'h5':
        // Poppins SemiBold, 16pt
        return 'font-montserrat-semibold text-[14px]';

      case 'caption-sm':
        // Poppins Regular, 12pt
        return 'font-montserrat-reg text-[10px]';

      case 'caption':
      default:
        // Poppins Regular, 14pt
        return 'font-montserrat-reg text-[12px]';
    }
  };

  return (
    <Text
      className={clsx(
        'text-black dark:text-white',
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

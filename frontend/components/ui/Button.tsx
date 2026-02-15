import React from 'react';
import { Pressable, Text, PressableProps } from 'react-native';
import { Palette } from '@/constants/theme';
import Typography from './Typography';

type Variant = 'default' | 'blue' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';
type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  rounded?: Rounded;
  className?: string;
  children: React.ReactNode;
}

const buttonVariantClasses: Record<Variant, string> = {
  default: 'bg-black',
  blue: `bg-[${Palette.blue}]`,
  destructive: 'bg-red-500',
  outline: 'border border-black bg-white',
  secondary: 'bg-gray-200',
  ghost: 'bg-transparent',
  link: 'bg-transparent',
};

const textVariantClasses: Record<Variant, string> = {
  default: 'text-white',
  blue: 'text-white',
  destructive: 'text-white',
  outline: 'text-black',
  secondary: 'text-gray-800',
  ghost: `text-[${Palette.blue}]`,
  link: `text-[${Palette.blue}]`,
};

const sizeClasses: Record<Size, string> = {
  default: 'px-4 py-2',
  sm: 'px-3 py-1',
  lg: 'px-6 py-3',
  icon: 'p-2',
};

const roundedClasses: Record<Rounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  rounded = 'md',
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClass = [
    'justify-center',
    'items-center',
    'flex-row',
    buttonVariantClasses[variant],
    sizeClasses[size],
    roundedClasses[rounded],
    disabled ? 'opacity-50' : '',
  ].join(' ');

  const buttonClassName = [baseClass, className].filter(Boolean).join(' ');

  const textClassName = [textVariantClasses[variant]].join(' ');

  return (
    <Pressable className={buttonClassName} disabled={disabled} {...props}>
      <Typography variant="h5" className={textClassName}>
        {children}
      </Typography>
    </Pressable>
  );
};

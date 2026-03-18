import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import clsx from 'clsx';
import Typography from './Typography';

type CardProps = ViewProps & {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 12,
  shadowOpacity: 0.25,
  elevation: 6,
};

export const Card = ({ className, ...props }: CardProps) => {
  return (
    <View
      className={clsx('rounded-3xl bg-white', className)}
      style={[cardShadow, props.style]}
      {...props}
    />
  );
};

/* ---------- Card Header ---------- */

export const CardHeader = ({ className, ...props }: ViewProps & { className?: string }) => {
  return <View className={clsx('flex flex-col gap-1.5 p-4', className)} {...props} />;
};

/* ---------- Card Title ---------- */

export const CardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <Typography
      variant="h5"
      className={clsx('font-semibold leading-none tracking-tight', className)}
    >
      {children}
    </Typography>
  );
};

/* ---------- Card Description ---------- */

export const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <Typography variant="caption" className={clsx('text-sm text-gray-500', className)}>
      {children}
    </Typography>
  );
};

/* ---------- Card Content ---------- */

export const CardContent = ({ className, ...props }: ViewProps & { className?: string }) => {
  return <View className={clsx('p-4 pt-0', className)} {...props} />;
};

/* ---------- Card Footer ---------- */

export const CardFooter = ({ className, ...props }: ViewProps & { className?: string }) => {
  return <View className={clsx('flex-row items-center p-4 pt-0', className)} {...props} />;
};

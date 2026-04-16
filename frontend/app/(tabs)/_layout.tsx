import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Home, Search, Users, Heart, Settings } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({
  focused,
  Icon,
}: {
  focused: boolean;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
}) {
  const defaultColor = useThemeColor({}, 'tabIconDefault');
  const selectedColor = useThemeColor({}, 'tabIconSelected');

  return (
    <View
      className={`
        ${focused ? 'bg-black' : 'bg-transparent'}
        rounded-full w-9 h-9 items-center justify-center
      `}
    >
      <Icon size={24} color={focused ? selectedColor : defaultColor} strokeWidth={2} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom + 4,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'white',
          paddingBottom: 0,
          paddingTop: 0,

          // shadow iOS
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,

          // shadow Android
          elevation: 10,
        },

        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarButton: (props: BottomTabBarButtonProps) => (
          <Pressable
            {...(props as any)}
            style={[
              props.style,
              {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 0,
              },
            ]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Home} />,
        }}
      />

      <Tabs.Screen
        name="search"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace('/(tabs)/search');
          },
        }}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Search} />,
        }}
      />

      <Tabs.Screen
        name="group"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace('/(tabs)/group');
          },
        }}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Users} />,
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Heart} />,
        }}
      />

      <Tabs.Screen
        name="setting"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace('/(tabs)/setting');
          },
        }}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Settings} />,
        }}
      />
    </Tabs>
  );
}
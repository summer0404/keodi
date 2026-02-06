import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Search, Users, Heart, Settings } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

function TabIcon({ focused, Icon }: { focused: boolean; Icon: any }) {
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          bottom: 36,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'white',

          // shadow iOS
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,

          // shadow Android
          elevation: 10,
        },
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
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Search} />,
        }}
      />

      <Tabs.Screen
        name="group"
        options={{
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
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Settings} />,
        }}
      />
    </Tabs>
  );
}

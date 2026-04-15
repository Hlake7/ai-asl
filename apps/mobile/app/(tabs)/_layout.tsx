import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#111' },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#555',
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
    </Tabs>
  );
}

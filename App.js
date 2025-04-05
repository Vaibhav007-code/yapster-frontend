import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthScreen from './src/components/screens/AuthScreen';
import RoomScreen from './src/components/screens/RoomScreen';
import ChatScreen from './src/components/screens/ChatScreen';
import UserListScreen from './src/components/screens/UserListScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerStyle: { backgroundColor: '#3498DB' },
            headerTintColor: 'white',
            headerTitleStyle: { fontSize: 20 }
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'YAPSTER' }} />
          <Stack.Screen name="Rooms" component={RoomScreen} options={{ title: 'Chat Rooms' }} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="UserList" component={UserListScreen} options={{ title: 'Online Users' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
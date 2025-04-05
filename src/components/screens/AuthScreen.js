import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../config';

export default function AuthScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const url = `${API_URL}${endpoint}`;
      
      console.log(`Sending request to: ${url}`);
      
      const response = await axios.post(url, {
        username: username.trim(),
        password: password.trim()
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response received:', response.data);

      // Handle successful login or registration
      if (isLogin) {
        // Verify login response has token and username
        if (response.data && response.data.token) {
          await AsyncStorage.setItem('user', username.trim());
          await AsyncStorage.setItem('password', password.trim());
          // Also store the token
          await AsyncStorage.setItem('token', response.data.token);
          navigation.navigate('Rooms');
        } else {
          throw new Error('Invalid login response');
        }
      } else {
        // Handle registration success
        if (response.data && response.data.message === 'User registered successfully') {
          Alert.alert('Success', 'Account created successfully. Please login.');
          setIsLogin(true);
        } else {
          throw new Error('Invalid registration response');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = 'Authentication failed. Please try again.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Check your connection.';
      } else if (error.response) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Check if server is running.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#3498db', '#2c3e50']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.innerContainer}
      >
        <MaterialIcons name="chat-bubble" size={80} color="#ecf0f1" style={styles.icon} />
        <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
        
        <View style={styles.inputContainer}>
          <MaterialIcons name="person" size={24} color="#7f8c8d" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#95a5a6"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={24} color="#7f8c8d" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#95a5a6"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={[styles.authButton, isLoading && styles.disabledButton]} 
          onPress={handleAuth}
          disabled={isLoading}
        >
          <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.gradient}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={isLoading}>
          <Text style={styles.switchText}>
            {isLogin ? 'New user? Create account' : 'Existing user? Sign in'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#1a1c22' 
  },
  innerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 30,
    backgroundColor: 'rgba(26, 28, 34, 0.8)'
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 40,
    width: 90,
    height: 90,
    opacity: 0.9
  },
  title: {
    fontSize: 32,
    color: '#ff7eb3',
    marginBottom: 50,
    textAlign: 'center',
    fontWeight: '700',
    textShadowColor: 'rgba(255, 126, 179, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1.2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 42, 54, 0.8)',
    borderWidth: 1,
    borderColor: '#7f5af0',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 20,
    elevation: 5,
    height: 60
  },
  inputIcon: {
    marginRight: 15,
    color: '#7f5af0'
  },
  input: {
    flex: 1,
    height: 60,
    color: '#fffffe',
    fontSize: 17,
    letterSpacing: 0.5
  },
  authButton: {
    marginTop: 30,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    height: 60
  },
  disabledButton: {
    opacity: 0.5
  },
  gradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: '#7f5af0'
  },
  buttonText: {
    color: '#fffffe',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  switchText: {
    color: '#94a1b2',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 15,
    textDecorationLine: 'underline',
    letterSpacing: 0.5
  }
});
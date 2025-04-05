import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { API_URL } from '../config';

export default function UserListScreen({ navigation, route }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState('');
  const [socket, setSocket] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(route.params?.roomName || null);

  useEffect(() => {
    let mounted = true;
    let socketInstance = null;

    const setupSocket = async () => {
      try {
        const username = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');
        
        if (mounted) {
          setCurrentUsername(username);
          
          socketInstance = io(API_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
          });
          
          socketInstance.on('connect', () => {
            if (mounted) {
              setConnectionError(false);
              socketInstance.emit('user_connected', { username, token });
              socketInstance.emit('get_online_users');
            }
          });
          
          socketInstance.on('online_users', (userList) => {
            if (mounted) {
              const filteredUsers = userList.filter(user => user !== username);
              setUsers(filteredUsers);
              setLoading(false);
            }
          });
          
          socketInstance.on('user_status_change', () => {
            if (mounted) {
              socketInstance.emit('get_online_users');
            }
          });
          
          socketInstance.on('connect_error', (error) => {
            if (mounted) {
              console.error('Socket connection error:', error);
              setConnectionError(true);
              setLoading(false);
            }
          });
          
          socketInstance.on('error', (error) => {
            if (mounted) {
              console.error('Socket error:', error);
              setLoading(false);
            }
          });
          
          socketInstance.on('disconnect', () => {
            if (mounted) {
              console.log('Socket disconnected');
            }
          });
          
          setSocket(socketInstance);
        }
      } catch (error) {
        console.error('User list socket setup error:', error);
        if (mounted) {
          setConnectionError(true);
          setLoading(false);
        }
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const startPrivateChat = (recipient) => {
    navigation.navigate('Chat', { 
      recipient,
      isPrivateChat: true
    });
  };

  const inviteToRoom = (username) => {
    if (!selectedRoom) {
      Alert.alert('Error', 'No room selected for invitation');
      return;
    }
    
    socket.emit('invite_to_room', { 
      roomName: selectedRoom, 
      username 
    }, (response) => {
      if (response && response.error) {
        Alert.alert('Error', response.error);
      } else {
        Alert.alert('Success', `Invitation sent to ${username}`);
      }
    });
  };

  const refreshUserList = () => {
    setLoading(true);
    setConnectionError(false);
    if (socket && socket.connected) {
      socket.emit('get_online_users');
    } else {
      setupSocket();
    }
  };

  const setupSocket = async () => {
    try {
      const username = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      
      const newSocket = io(API_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      newSocket.on('connect', () => {
        setConnectionError(false);
        newSocket.emit('user_connected', { username, token });
        newSocket.emit('get_online_users');
      });
      
      newSocket.on('online_users', (userList) => {
        const filteredUsers = userList.filter(user => user !== username);
        setUsers(filteredUsers);
        setLoading(false);
      });
      
      newSocket.on('user_status_change', () => {
        newSocket.emit('get_online_users');
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(true);
        setLoading(false);
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setLoading(false);
      });
      
      setSocket(newSocket);
    } catch (error) {
      console.error('User list socket setup error:', error);
      setConnectionError(true);
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#3498db', '#2c3e50']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#ecf0f1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedRoom ? `Invite to ${selectedRoom}` : 'Online Users'}
        </Text>
        <TouchableOpacity onPress={refreshUserList} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color="#ecf0f1" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ecf0f1" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : connectionError ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={48} color="#ecf0f1" />
          <Text style={styles.emptyText}>Connection error</Text>
          <TouchableOpacity onPress={refreshUserList} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="person-off" size={48} color="#ecf0f1" />
          <Text style={styles.emptyText}>No users online</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userItem}
              onPress={() => selectedRoom ? inviteToRoom(item) : startPrivateChat(item)}
              onLongPress={() => {
                if (selectedRoom) {
                  Alert.alert(
                    'Invite User',
                    `Invite ${item} to ${selectedRoom}?`,
                    [
                      { text: 'Invite', onPress: () => inviteToRoom(item) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }
              }}
            >
              <View style={styles.userAvatar}>
                <MaterialIcons name="person" size={24} color="#2c3e50" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item}</Text>
                <Text style={styles.userStatus}>Online</Text>
              </View>
              {selectedRoom ? (
                <MaterialIcons name="group-add" size={24} color="#3498db" />
              ) : (
                <MaterialIcons name="chat" size={24} color="#3498db" />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#1a1c22'
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 16, 
    paddingHorizontal: 16,
    backgroundColor: '#232530',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 90, 240, 0.3)',
    elevation: 4
  },
  backButton: { 
    marginRight: 16,
    padding: 8,
    backgroundColor: 'rgba(127, 90, 240, 0.1)',
    borderRadius: 50
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#fffffe', 
    flex: 1,
    letterSpacing: 0.8
  },
  refreshButton: { 
    padding: 10,
    backgroundColor: 'rgba(127, 90, 240, 0.1)',
    borderRadius: 50
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(26, 28, 34, 0.9)'
  },
  loadingText: { 
    color: '#ff7eb3', 
    marginTop: 16, 
    fontSize: 20,
    letterSpacing: 0.5
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(26, 28, 34, 0.9)'
  },
  emptyText: { 
    color: '#fffffe', 
    fontSize: 20, 
    marginTop: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 30
  },
  retryButton: { 
    marginTop: 20, 
    backgroundColor: 'rgba(127, 90, 240, 0.3)', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.5)'
  },
  retryText: { 
    color: '#fffffe', 
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5
  },
  userItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#232530', 
    borderRadius: 16, 
    padding: 16, 
    marginHorizontal: 16, 
    marginVertical: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#7f5af0'
  },
  userAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'rgba(127, 90, 240, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(127, 90, 240, 0.5)'
  },
  userInfo: { 
    flex: 1 
  },
  userName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#fffffe',
    letterSpacing: 0.5
  },
  userStatus: { 
    fontSize: 14, 
    color: '#2cb67d', 
    marginTop: 6,
    fontWeight: '500'
  }
});
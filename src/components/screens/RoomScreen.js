import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, Modal, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Remove the arrow function syntax here
export default function RoomScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [tempRoomData, setTempRoomData] = useState(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [currentRoomMembers, setCurrentRoomMembers] = useState([]);
  const [currentRoomAdmins, setCurrentRoomAdmins] = useState([]);
  const [currentRoomName, setCurrentRoomName] = useState('');

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    AsyncStorage.getItem('user').then(username => setCurrentUsername(username));
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Room name is required');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      const username = await AsyncStorage.getItem('user');
      
      await axios.post(
        `${API_URL}/api/rooms`,
        {
          name: roomName.trim(),
          isPrivate,
          password: isPrivate ? password.trim() : undefined,
          creator: username
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setModalVisible(false);
      setRoomName('');
      setIsPrivate(false);
      setPassword('');
      fetchRooms();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create room');
    }
  };

  const handleJoinRoom = (roomData) => {
    const isMember = roomData.members?.includes(currentUsername) || false;
    
    if (roomData.isPrivate && !isMember) {
      setTempRoomData(roomData);
      setPasswordModalVisible(true);
    } else {
      navigation.navigate('Chat', { 
        roomName: roomData.name,
        isPrivateChat: false,
        isAdmin: roomData.creator === currentUsername
      });
    }
  };

  const joinPrivateRoom = () => {
    if (joinPassword.trim()) {
      navigation.navigate('Chat', { 
        roomName: tempRoomData.name,
        password: joinPassword,
        isPrivateChat: false,
        isAdmin: tempRoomData.creator === currentUsername
      });
      setPasswordModalVisible(false);
      setJoinPassword('');
      setTempRoomData(null);
    } else {
      Alert.alert('Error', 'Password is required for private rooms');
    }
  };

  const handleDeleteRoom = async (roomName) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${API_URL}/api/rooms/${roomName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRooms();
      Alert.alert('Success', 'Room deleted successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete room');
    }
  };

  const showRoomMembers = async (roomName) => {
    try {
      const room = rooms.find(r => r.name === roomName);
      if (room) {
        setCurrentRoomMembers(room.members || []);
        setCurrentRoomAdmins(room.admins || [room.creator]);
        setCurrentRoomName(roomName);
        setMembersModalVisible(true);
      }
    } catch (error) {
      console.error('Failed to show room members:', error);
    }
  };

  const kickUser = (username) => {
    Alert.alert(
      'Kick User',
      `Are you sure you want to kick ${username} from ${currentRoomName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick', onPress: () => handleKickUser(username) }
      ]
    );
  };

  const handleKickUser = async (username) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${API_URL}/api/rooms/kick`, {
        roomName: currentRoomName,
        username
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const updatedMembers = currentRoomMembers.filter(member => member !== username);
      setCurrentRoomMembers(updatedMembers);
      fetchRooms();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to kick user');
    }
  };

  return (
    <LinearGradient colors={['#3498db', '#2c3e50']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Rooms</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.onlineButton} onPress={() => navigation.navigate('UserList')}>
            <MaterialIcons name="people" size={24} color="#ecf0f1" />
            <Text style={styles.onlineText}>Online Users</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <MaterialIcons name="add-circle" size={32} color="#ecf0f1" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.noRoomsText}>No rooms available</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.roomItem}
              onPress={() => handleJoinRoom(item)}
              onLongPress={() => {
                if (item.creator === currentUsername) {
                  Alert.alert(
                    'Room Options',
                    null,
                    [
                      { text: 'Delete Room', onPress: () => handleDeleteRoom(item.name) },
                      { text: 'View Members', onPress: () => showRoomMembers(item.name) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                } else {
                  showRoomMembers(item.name);
                }
              }}
            >
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{item.name}</Text>
                <Text style={styles.roomCreator}>Created by: {item.creator}</Text>
                <Text style={styles.roomMembers}>Members: {item.members?.length || 1}</Text>
              </View>
              <View style={styles.roomStatus}>
                {item.isPrivate ? (
                  <MaterialIcons name="lock" size={24} color="#e74c3c" />
                ) : (
                  <MaterialIcons name="lock-open" size={24} color="#2ecc71" />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Room</Text>
            <TextInput
              style={styles.input}
              placeholder="Room Name"
              value={roomName}
              onChangeText={setRoomName}
            />
            <View style={styles.privateContainer}>
              <Text style={styles.privateLabel}>Private Room</Text>
              <TouchableOpacity
                style={[styles.toggle, isPrivate && styles.toggleActive]}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <View style={[styles.toggleCircle, isPrivate && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>
            {isPrivate && (
              <TextInput
                style={styles.input}
                placeholder="Room Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateRoom}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={passwordModalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Room Password"
              secureTextEntry
              value={joinPassword}
              onChangeText={setJoinPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={joinPrivateRoom}
              >
                <Text style={styles.buttonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={membersModalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Room Members ({currentRoomName})</Text>
            <FlatList
              data={currentRoomMembers}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <View style={styles.memberItem}>
                  <Text style={styles.memberName}>{item} {currentRoomAdmins.includes(item) && '(Admin)'}</Text>
                  {currentRoomAdmins.includes(currentUsername) && !currentRoomAdmins.includes(item) && (
                    <TouchableOpacity onPress={() => kickUser(item)}>
                      <MaterialIcons name="person-remove" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={() => setMembersModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#1a1c22'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: 50, 
    paddingBottom: 16,
    backgroundColor: '#232530',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 90, 240, 0.3)',
    elevation: 4
  },
  headerTitle: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#fffffe',
    letterSpacing: 0.8
  },
  headerIcons: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  onlineButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 16, 
    backgroundColor: 'rgba(127, 90, 240, 0.2)', 
    padding: 10, 
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.5)'
  },
  onlineText: { 
    color: '#fffffe', 
    marginLeft: 6,
    fontWeight: '500'
  },
  centerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(26, 28, 34, 0.9)'
  },
  loadingText: { 
    color: '#ff7eb3', 
    fontSize: 20,
    letterSpacing: 0.5
  },
  noRoomsText: { 
    color: '#fffffe', 
    fontSize: 20,
    letterSpacing: 0.5
  },
  roomItem: { 
    backgroundColor: '#232530', 
    borderRadius: 16, 
    padding: 18, 
    marginHorizontal: 16, 
    marginVertical: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#7f5af0'
  },
  roomInfo: { 
    flex: 1 
  },
  roomName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#fffffe',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  roomCreator: { 
    fontSize: 14, 
    color: '#94a1b2', 
    marginTop: 4 
  },
  roomMembers: { 
    fontSize: 12, 
    color: '#94a1b2',
    marginTop: 2
  },
  roomStatus: {},
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(26, 28, 34, 0.85)' 
  },
  modalContent: { 
    backgroundColor: '#232530', 
    borderRadius: 16, 
    padding: 24, 
    width: '85%', 
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.5)',
    elevation: 8
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    textAlign: 'center', 
    color: '#fffffe',
    letterSpacing: 0.8
  },
  input: { 
    borderWidth: 1, 
    borderColor: 'rgba(127, 90, 240, 0.5)', 
    borderRadius: 10, 
    padding: 14,
    paddingLeft: 16,
    marginBottom: 20,
    color: '#fffffe',
    backgroundColor: '#2a2d3a',
    fontSize: 16
  },
  privateContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20,
    backgroundColor: 'rgba(127, 90, 240, 0.1)',
    padding: 12,
    borderRadius: 10
  },
  privateLabel: { 
    fontSize: 16, 
    color: '#fffffe',
    fontWeight: '500'
  },
  toggle: { 
    width: 56, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#4f4a6b', 
    padding: 2, 
    justifyContent: 'center' 
  },
  toggleActive: { 
    backgroundColor: '#7f5af0' 
  },
  toggleCircle: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#fffffe',
    elevation: 2
  },
  toggleCircleActive: { 
    marginLeft: 'auto' 
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 10
  },
  button: { 
    borderRadius: 10, 
    padding: 14, 
    width: '48%', 
    alignItems: 'center',
    elevation: 3
  },
  cancelButton: { 
    backgroundColor: '#4f4a6b',
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.3)'
  },
  createButton: { 
    backgroundColor: '#7f5af0' 
  },
  closeButton: { 
    backgroundColor: '#7f5af0', 
    marginTop: 20,
    borderRadius: 10,
    padding: 14
  },
  buttonText: { 
    color: '#fffffe', 
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5
  },
  memberItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(127, 90, 240, 0.2)',
    backgroundColor: 'rgba(127, 90, 240, 0.05)'
  },
  memberName: { 
    fontSize: 16,
    color: '#fffffe'
  }
});
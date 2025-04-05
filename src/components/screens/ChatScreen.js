import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Modal,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { API_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function ChatScreen({ navigation, route }) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);
  
  const { isPrivateChat, roomName, recipient, socket: routeSocket } = route.params;
  const chatTitle = isPrivateChat ? recipient : roomName;

  useEffect(() => {
    const setupChat = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');
        setUsername(storedUsername);

        if (!token) {
          navigation.navigate('Auth');
          return;
        }

        if (routeSocket) {
          setSocket(routeSocket);
        } else {
          const newSocket = io(API_URL);
          setSocket(newSocket);
          newSocket.emit('user_connected', { username: storedUsername, token });
          
          if (!isPrivateChat && roomName) {
            newSocket.emit('join_room', { roomName });
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Chat setup error:', error);
        setLoading(false);
      }
    };

    setupChat();
    
    return () => {
      if (socket && !routeSocket) {
        socket.disconnect();
      }
    };
  }, [navigation, isPrivateChat, roomName, routeSocket]);

  useEffect(() => {
    if (!socket) return;

    if (isPrivateChat) {
      socket.emit('get_private_messages', { otherUser: recipient });
      
      socket.on('private_message_history', (data) => {
        if (data && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      });
      
      socket.on('private_message', (message) => {
        if ((message.sender === recipient && message.recipient === username) || 
            (message.sender === username && message.recipient === recipient)) {
          setMessages(currentMessages => [...currentMessages, message]);
        }
      });
    } else {
      socket.emit('get_room_history', { roomName });
      
      socket.on('room_history', (data) => {
        if (data && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      });
      
      socket.on('new_room_message', (data) => {
        if (data.room === roomName) {
          setMessages(currentMessages => [...currentMessages, data.message]);
        }
      });
      
      socket.on('user_joined_room', ({ username: joinedUser, room: joinedRoom }) => {
        if (joinedRoom === roomName) {
          const systemMessage = {
            id: Date.now().toString(),
            text: `${joinedUser} joined the room`,
            timestamp: new Date().toISOString(),
            isSystem: true
          };
          setMessages(currentMessages => [...currentMessages, systemMessage]);
        }
      });
    }
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    });

    return () => {
      socket.off('private_message_history');
      socket.off('private_message');
      socket.off('room_history');
      socket.off('new_room_message');
      socket.off('user_joined_room');
      socket.off('error');
    };
  }, [socket, isPrivateChat, recipient, roomName, username]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = () => {
    if (!messageText.trim() && !selectedImage) return;
    
    const messageContent = {
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      media: selectedImage
    };
    
    if (isPrivateChat) {
      socket.emit('private_message', {
        recipient,
        message: messageContent
      });
    } else {
      socket.emit('room_message', {
        roomName,
        message: messageContent
      });
    }
    
    setMessageText('');
    setSelectedImage(null);
  };

  const openMediaPicker = async () => {
    setMediaPickerVisible(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your media library');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true
    });
    
    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setSelectedImage(base64Image);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.sender === username;
    const isSystemMessage = item.isSystem;
    
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageContent,
          isCurrentUser ? styles.currentUserMessageContent : {}
        ]}>
          <Text style={styles.messageAuthor}>
            {isPrivateChat ? (isCurrentUser ? 'You' : recipient) : (isCurrentUser ? 'You' : item.sender)}
          </Text>
          
          {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
          
          {item.media && (
            <Image 
              source={{ uri: item.media }} 
              style={styles.messageImage} 
              resizeMode="contain"
            />
          )}
          
          <Text style={styles.messageTime}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient 
      colors={['#3498db', '#2c3e50']} 
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ecf0f1" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPrivateChat ? (
              <>
                <MaterialIcons name="person" size={22} color="#ecf0f1" style={styles.headerIcon} />
                {" " + chatTitle}
              </>
            ) : (
              <>
                <MaterialIcons name="forum" size={22} color="#ecf0f1" style={styles.headerIcon} />
                {" " + chatTitle}
              </>
            )}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ecf0f1" />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => (item.id ? item.id.toString() : `msg-${index}`)}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="chat-bubble-outline" size={48} color="#bdc3c7" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubText}>Be the first to send a message!</Text>
                </View>
              }
            />

            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedImage(null)}>
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
              style={styles.inputContainer}
            >
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={() => setMediaPickerVisible(true)}
              >
                <MaterialIcons name="attach-file" size={24} color="#7f8c8d" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#95a5a6"
                value={messageText}
                onChangeText={setMessageText}
                multiline
              />
              
              <TouchableOpacity
                style={[
                  styles.sendButton, 
                  (!messageText.trim() && !selectedImage) && styles.disabledButton
                ]}
                onPress={sendMessage}
                disabled={!messageText.trim() && !selectedImage}
              >
                <MaterialIcons 
                  name="send" 
                  size={24} 
                  color={(messageText.trim() || selectedImage) ? "#ecf0f1" : "#bdc3c7"} 
                />
              </TouchableOpacity>
            </KeyboardAvoidingView>
            
            <Modal
              visible={mediaPickerVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setMediaPickerVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setMediaPickerVisible(false)}
              >
                <View style={styles.modalContent}>
                  <TouchableOpacity style={styles.mediaOption} onPress={openMediaPicker}>
                    <MaterialIcons name="photo" size={30} color="#3498db" />
                    <Text style={styles.mediaOptionText}>Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.mediaOption} onPress={() => {
                    setMediaPickerVisible(false);
                    Alert.alert('Feature coming soon', 'Camera support will be available in the next update');
                  }}>
                    <MaterialIcons name="camera-alt" size={30} color="#3498db" />
                    <Text style={styles.mediaOptionText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        )}
      </SafeAreaView>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 50,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fffffe',
    flex: 1,
    letterSpacing: 0.5
  },
  headerIcon: {
    marginRight: 5,
    color: '#7f5af0'
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
    fontSize: 18,
    letterSpacing: 0.5
  },
  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100
  },
  emptyText: {
    color: '#fffffe',
    fontSize: 20,
    marginTop: 16,
    letterSpacing: 0.5
  },
  emptySubText: {
    color: '#94a1b2',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 30
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '85%'
  },
  currentUserMessage: {
    alignSelf: 'flex-end'
  },
  otherUserMessage: {
    alignSelf: 'flex-start'
  },
  messageContent: {
    backgroundColor: '#232530',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 14,
    elevation: 2
  },
  currentUserMessageContent: {
    backgroundColor: 'rgba(127, 90, 240, 0.9)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4
  },
  messageAuthor: {
    fontSize: 13,
    color: '#94a1b2',
    marginBottom: 3,
    fontWeight: '500'
  },
  messageText: {
    fontSize: 16,
    color: '#fffffe',
    lineHeight: 22
  },
  messageImage: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    marginVertical: 8
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 254, 0.6)',
    alignSelf: 'flex-end',
    marginTop: 4
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12
  },
  systemMessageText: {
    fontSize: 14,
    color: '#fffffe',
    backgroundColor: 'rgba(127, 90, 240, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 30
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#232530',
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 90, 240, 0.3)'
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2d3a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
    color: '#fffffe'
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7f5af0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 3
  },
  disabledButton: {
    backgroundColor: '#4f4a6b'
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2d3a',
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  previewContainer: {
    backgroundColor: '#232530',
    padding: 12,
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 90, 240, 0.3)'
  },
  imagePreview: {
    height: 120,
    width: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(127, 90, 240, 0.5)'
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(26, 28, 34, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff7eb3'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 28, 34, 0.8)'
  },
  modalContent: {
    backgroundColor: '#232530',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 90, 240, 0.5)'
  },
  mediaOption: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(127, 90, 240, 0.1)',
    borderRadius: 12,
    width: 100,
    height: 100,
    justifyContent: 'center'
  },
  mediaOptionText: {
    marginTop: 12,
    color: '#fffffe',
    fontSize: 16,
    textAlign: 'center'
  }
});
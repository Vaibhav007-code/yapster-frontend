import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function MessageBubble({ message, isOwn, isPrivate }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConnectionIndicator = () => {
    if (!isOwn) return null;
    
    // Add syncing/pending indicator for messages that haven't been confirmed by the server
    if (message.status === 'pending') {
      return <Text style={[styles.tickMark, { color: '#999' }]}>⟳</Text>;
    }
    
    return <Text style={styles.tickMark}>✓</Text>;
  };

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownContainer : styles.otherContainer
    ]}>
      {!isOwn && (
        <Text style={styles.sender}>{message.sender}</Text>
      )}
      
      {message.text ? (
        <View style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          isPrivate && styles.privateBubble,
          message.status === 'pending' && styles.pendingBubble
        ]}>
          <Text style={styles.text}>{message.text}</Text>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
          
          {isOwn && (
            <View style={styles.tickContainer}>
              {getConnectionIndicator()}
            </View>
          )}
        </View>
      ) : message.media && (
        <View style={[
          styles.mediaBubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          message.status === 'pending' && styles.pendingBubble
        ]}>
          <Image 
            source={{ uri: message.media }} 
            style={styles.mediaImage} 
            resizeMode="cover"
          />
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
          
          {message.status === 'uploading' && (
            <View style={styles.uploadingOverlay}>
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
          
          {isOwn && message.status !== 'uploading' && (
            <View style={styles.mediaTickContainer}>
              {getConnectionIndicator()}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  sender: {
    fontSize: 13,
    color: '#ff7eb3',
    marginBottom: 3,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 0.3
  },
  bubble: {
    padding: 12,
    paddingRight: 40,
    borderRadius: 16,
    position: 'relative',
    elevation: 2
  },
  ownBubble: {
    backgroundColor: 'rgba(127, 90, 240, 0.9)',
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 16
  },
  otherBubble: {
    backgroundColor: '#232530',
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 16
  },
  privateBubble: {
    backgroundColor: '#724cf9',
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 179, 0.5)'
  },
  pendingBubble: {
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    color: '#fffffe',
    lineHeight: 22
  },
  timestamp: {
    position: 'absolute',
    bottom: 6,
    right: 12,
    fontSize: 10,
    color: 'rgba(255, 255, 254, 0.6)',
    letterSpacing: 0.2
  },
  tickContainer: {
    position: 'absolute',
    bottom: 6,
    right: 38,
  },
  mediaTickContainer: {
    position: 'absolute',
    bottom: 6,
    right: 28,
  },
  tickMark: {
    fontSize: 10,
    color: '#ff7eb3',
  },
  mediaBubble: {
    padding: 4,
    paddingBottom: 20,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    borderBottomRightRadius: 0,
    elevation: 3
  },
  mediaImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 28, 34, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fffffe',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
});
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
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ChatMessage } from '../types';
import { getMessages, sendMessage } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatScreen'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const t = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastFetchedRef = useRef<string | undefined>(undefined);

  const fetchMessages = async () => {
    try {
      const newMessages = await getMessages(orderId, lastFetchedRef.current);
      if (newMessages.length > 0) {
        // Sort by created_at just in case, though backend should handle it
        newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Update last fetched timestamp
        const lastMsg = newMessages[newMessages.length - 1];
        lastFetchedRef.current = lastMsg.created_at;

        setMessages(prev => {
          // Avoid duplicates if any (basic check)
          const existingIds = new Set(prev.map(m => m.id));
          const filteredNew = newMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...filteredNew];
        });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    setSending(true);
    const content = inputText.trim();
    setInputText(''); // Clear immediately for UX

    try {
      await sendMessage(orderId, { content });
      await fetchMessages(); // Fetch immediately to show the new message
    } catch (error) {
      console.error('Failed to send message:', error);
      // Ideally show error to user, but for now just log
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.message_type === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessageText, t.typography.caption, { color: t.colors.subtext }]}>
            {item.content}
          </Text>
        </View>
      );
    }

    const isMe = item.sender_id === user?.id;

    return (
      <View style={[
        styles.messageRow,
        isMe ? styles.myMessageRow : styles.otherMessageRow
      ]}>
        {!isMe && (
          <Text style={[styles.senderName, t.typography.caption2, { color: t.colors.subtext }]}>
            {item.sender_nickname}
          </Text>
        )}
<View style={[
styles.bubble,
{ borderRadius: t.radius.pill },
isMe ? { backgroundColor: t.colors.accent } : { backgroundColor: t.colors.card }
]}>
<Text style={[
styles.messageText,
t.typography.body,
isMe ? { color: '#FFFFFF' } : { color: t.colors.text }
]}>
{item.content}
</Text>
</View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Chat" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={t.colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

          <View style={[styles.inputContainer, { backgroundColor: t.colors.card, borderTopColor: t.colors.border }]}>
          <TextInput
            style={[styles.input, { color: t.colors.text, backgroundColor: t.colors.bg, borderRadius: t.radius.pill }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={t.colors.subtext}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { opacity: !inputText.trim() || sending ? 0.5 : 1 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <FontAwesome5 name="paper-plane" size={20} color={t.colors.accent} solid />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  systemMessageText: {
    fontStyle: 'italic',
    fontSize: 12,
    textAlign: 'center',
  },
  messageRow: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 10,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});

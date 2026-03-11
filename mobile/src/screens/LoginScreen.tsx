import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { detail: string } } }).response.data.detail
          : 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <FontAwesome5 name="paper-plane" size={40} color={t.colors.accent} style={styles.headerIcon} />
          <Text style={[t.typography.largeTitle, { color: t.colors.text, textAlign: 'center' }]}>DeliverU</Text>
          <Text style={[t.typography.footnote, { color: t.colors.subtext, textAlign: 'center', marginTop: 8 }]}>
            Sign in with your HKUST email
          </Text>
        </View>

        <View style={[
          styles.inputContainer,
          { 
            backgroundColor: t.colors.secondaryBg,
            borderColor: t.colors.separator,
            borderRadius: t.radius.lg 
          },
          t.shadow.subtle
        ]}>
          <FontAwesome5 name="envelope" size={18} color={t.colors.subtext} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: t.colors.text }]}
            placeholder="Email (@connect.ust.hk)"
            placeholderTextColor={t.colors.subtext}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={[
          styles.inputContainer,
          { 
            backgroundColor: t.colors.secondaryBg,
            borderColor: t.colors.separator,
            borderRadius: t.radius.lg 
          },
          t.shadow.subtle
        ]}>
          <FontAwesome5 name="lock" size={18} color={t.colors.subtext} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: t.colors.text }]}
            placeholder="Password"
            placeholderTextColor={t.colors.subtext}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: t.colors.accent, borderRadius: t.radius.md },
            loading && styles.buttonDisabled
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
             <Text style={[t.typography.headline, styles.buttonText]}>Signing in...</Text>
          ) : (
            <View style={styles.buttonContent}>
              <FontAwesome5 name="sign-in-alt" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={[t.typography.headline, styles.buttonText]}>Sign In</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
          <Text style={[t.typography.footnote, { color: t.colors.subtext, textAlign: 'center' }]}>
            Don't have an account? <Text style={{ color: t.colors.accent, fontWeight: '600' }}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerIcon: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  button: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
  },
  linkButton: {
    padding: 8,
  },
});

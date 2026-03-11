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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirm) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.trim().toLowerCase().endsWith('@connect.ust.hk')) {
      Alert.alert('Error', 'Only @connect.ust.hk emails are allowed');
      return;
    }

    if (password.length < 8 || password.length > 12) {
      Alert.alert('Error', 'Password must be 8–12 characters');
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(password)) {
      Alert.alert('Error', 'Password must contain only letters and numbers');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one capital letter');
      return;
    }

    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { detail: string } } }).response.data.detail
          : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
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
          <FontAwesome5 name="user-plus" size={36} color={t.colors.accent} style={styles.headerIcon} />
          <Text style={[t.typography.largeTitle, { color: t.colors.text, textAlign: 'center' }]}>Create Account</Text>
          <Text style={[t.typography.footnote, { color: t.colors.subtext, textAlign: 'center', marginTop: 8 }]}>
            Register with your HKUST email
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
            placeholder="Password (8–12 chars, 1 uppercase)"
            placeholderTextColor={t.colors.subtext}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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
            placeholder="Confirm Password"
            placeholderTextColor={t.colors.subtext}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: t.colors.accent, borderRadius: t.radius.md },
            loading && styles.buttonDisabled
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
             <Text style={[t.typography.headline, styles.buttonText]}>Creating...</Text>
          ) : (
            <View style={styles.buttonContent}>
              <FontAwesome5 name="user-plus" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={[t.typography.headline, styles.buttonText]}>Create Account</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
          <Text style={[t.typography.footnote, { color: t.colors.subtext, textAlign: 'center' }]}>
            Already have an account? <Text style={{ color: t.colors.accent, fontWeight: '600' }}>Sign In</Text>
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
    marginBottom: 32,
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

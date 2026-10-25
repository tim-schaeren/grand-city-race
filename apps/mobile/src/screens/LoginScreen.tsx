import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { copy } from '@grandcityrace/shared';
import { auth } from '../firebase';
import SignUpModal from '../components/SignUpModal';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      Alert.alert(copy.login.failedTitle, copy.login.failedMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>{copy.login.title}</Text>

        <TextInput
          style={styles.input}
          placeholder={copy.login.email}
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder={copy.login.password}
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
        />

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
              <Text style={styles.primaryButtonText}>{copy.login.signIn}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowSignUp(true)}>
              <Text style={styles.secondaryButtonText}>{copy.login.createAccount}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <SignUpModal visible={showSignUp} onClose={() => setShowSignUp(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 2,
  },
  // Colours set outright: Android otherwise takes them from the phone's dark
  // mode, light grey on this white field
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
  },
  buttons: {
    marginTop: 12,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
});

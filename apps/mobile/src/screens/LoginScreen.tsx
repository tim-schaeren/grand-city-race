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
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { copy, THEMES, TEXT_LIMITS } from '@grandcityrace/shared';
import { auth } from '../firebase';
import { LEGAL, WEB_URL } from '../config';
import SignUpModal from '../components/SignUpModal';
import Logo from '../components/Logo';
import Icon from '../theme/Icon';

// The first thing anyone sees, in the Retro look of the website's front page,
// kept plain: signing in to play, and the way to hosting, which lives on the web
const { colors: C, fonts: F, shape: S } = THEMES.retro;
const HOST_URL = `${WEB_URL}/login?mode=signup`;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
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

  // Firebase sends the email and hosts the page for choosing a new password
  async function handleForgotPassword() {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      Alert.alert(copy.login.forgotPassword, copy.login.resetNeedsEmail);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, address);
      Alert.alert(copy.login.resetTitle, copy.login.resetSent(address));
    } catch (e) {
      const code = (e as { code?: string })?.code;
      // An unknown address gets the same answer as a known one
      if (code === 'auth/user-not-found') Alert.alert(copy.login.resetTitle, copy.login.resetSent(address));
      else Alert.alert(copy.login.forgotPassword, copy.login.resetFailed);
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Logo size={63} color={C.text} />
            </View>
            <Text style={styles.brandName}>{copy.login.brand}</Text>
          </View>

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder={copy.login.email}
              placeholderTextColor={C.mutedOnSurface}
              value={email}
              maxLength={TEXT_LIMITS.email}
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
              placeholderTextColor={C.mutedOnSurface}
              value={password}
              maxLength={TEXT_LIMITS.password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            {loading ? (
              <ActivityIndicator size="large" color={C.accent} style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.buttons}>
                <TouchableOpacity style={[styles.button, styles.buttonDark]} onPress={handleSignIn}>
                  <Text style={[styles.buttonText, { color: C.onAccent }]}>{copy.login.signIn}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonLight]} onPress={() => setShowSignUp(true)}>
                  <Text style={[styles.buttonText, { color: C.onSurface }]}>{copy.login.createAccount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkButton} onPress={handleForgotPassword} hitSlop={8}>
                  <Text style={styles.linkText}>{copy.login.forgotPassword}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => Linking.openURL(LEGAL.help)} hitSlop={8}>
              <Text style={styles.footerLink}>{copy.common.howToPlay}</Text>
            </TouchableOpacity>
            <Text style={styles.footerLink}>·</Text>
            <TouchableOpacity style={styles.footerHost} onPress={() => Linking.openURL(HOST_URL)} hitSlop={8} accessibilityRole="link">
              <Text style={styles.footerLink}>{copy.login.hostButton}</Text>
              <Icon name="open-in-new" size={14} color={C.text} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SignUpModal visible={showSignUp} onClose={() => setShowSignUp(false)} />
    </>
  );
}

const shadow = {
  shadowColor: C.shadow,
  shadowOffset: { width: S.shadowOffset, height: S.shadowOffset },
  shadowOpacity: 1,
  shadowRadius: 0,
  // Android draws no hard shadows; the border carries the look there
  elevation: 0,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  brand: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  brandMark: {
    backgroundColor: C.surface,
    borderWidth: S.borderWidth,
    borderColor: C.border,
    borderRadius: 10,
    padding: 6,
    ...shadow,
  },
  brandName: {
    fontFamily: F.display,
    fontSize: 22,
    color: C.text,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: S.borderWidth,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  // Colours set outright: Android otherwise takes them from the phone's dark
  // mode, light grey on this pale field
  input: {
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: C.onSurface,
    backgroundColor: '#ffffff',
  },
  buttons: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: S.borderWidth,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 14,
  },
  buttonDark: {
    backgroundColor: C.accent,
  },
  buttonLight: {
    backgroundColor: C.surface,
  },
  buttonText: {
    fontFamily: F.display,
    fontSize: 17,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: C.mutedOnSurface,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  footerHost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLink: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { COLORS, SPACING, FONT_SIZE } from '../../src/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    university_name: '',
    nin: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        university_name: formData.university_name || undefined,
        nin: formData.nin || undefined,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.detail || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join the campus marketplace community
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChangeText={(v) => updateField('full_name', v)}
              icon="person"
              error={errors.full_name}
            />

            <Input
              label="University Email"
              placeholder="you@university.edu.ng"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              placeholder="08012345678"
              value={formData.phone}
              onChangeText={(v) => updateField('phone', v)}
              keyboardType="phone-pad"
              icon="call"
              error={errors.phone}
            />

            <Input
              label="University Name (Optional)"
              placeholder="e.g., University of Lagos"
              value={formData.university_name}
              onChangeText={(v) => updateField('university_name', v)}
              icon="school"
            />

            <Input
              label="NIN (Optional - for verification)"
              placeholder="11 digit NIN"
              value={formData.nin}
              onChangeText={(v) => updateField('nin', v)}
              keyboardType="number-pad"
              icon="card"
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(v) => updateField('password', v)}
              secureTextEntry
              icon="lock-closed"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              secureTextEntry
              icon="lock-closed"
              error={errors.confirmPassword}
            />

            <Text style={styles.terms}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="large"
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    marginTop: SPACING.md,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  header: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  form: {
    flex: 1,
  },
  terms: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
  registerButton: {
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});

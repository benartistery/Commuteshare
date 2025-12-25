import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../src/components/common/Input';
import { Button } from '../src/components/common/Button';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import api from '../src/api/client';

const cuisineTypes = [
  { id: 'nigerian', name: 'Nigerian' },
  { id: 'continental', name: 'Continental' },
  { id: 'chinese', name: 'Chinese' },
  { id: 'fast_food', name: 'Fast Food' },
  { id: 'drinks', name: 'Drinks & Smoothies' },
  { id: 'snacks', name: 'Snacks' },
];

export default function AddRestaurantScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    phone: '',
    opening_hours: '',
  });
  const [image, setImage] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImage(base64Image);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.cuisine_type || !formData.address || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/restaurants', {
        name: formData.name,
        description: formData.description,
        cuisine_type: formData.cuisine_type,
        address: formData.address,
        phone: formData.phone,
        opening_hours: formData.opening_hours || null,
        image: image,
      });
      Alert.alert('Success', 'Restaurant registered successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Restaurant</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Cover Image */}
          <Text style={styles.label}>Cover Image</Text>
          <TouchableOpacity style={styles.imagePickerLarge} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.coverImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="restaurant" size={48} color={COLORS.textMuted} />
                <Text style={styles.imagePlaceholderText}>Add Restaurant Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Input
            label="Restaurant Name *"
            placeholder="Enter restaurant name"
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            icon="storefront"
          />

          <Input
            label="Description"
            placeholder="Tell customers about your restaurant"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={3}
          />

          {/* Cuisine Type */}
          <Text style={styles.label}>Cuisine Type *</Text>
          <View style={styles.cuisineGrid}>
            {cuisineTypes.map((cuisine) => (
              <TouchableOpacity
                key={cuisine.id}
                style={[
                  styles.cuisineChip,
                  formData.cuisine_type === cuisine.id && styles.cuisineChipActive,
                ]}
                onPress={() => updateField('cuisine_type', cuisine.id)}
              >
                <Text
                  style={[
                    styles.cuisineText,
                    formData.cuisine_type === cuisine.id && styles.cuisineTextActive,
                  ]}
                >
                  {cuisine.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Address *"
            placeholder="Restaurant location/address"
            value={formData.address}
            onChangeText={(v) => updateField('address', v)}
            icon="location"
          />

          <Input
            label="Phone Number *"
            placeholder="08012345678"
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
            icon="call"
          />

          <Input
            label="Opening Hours"
            placeholder="e.g., 8am - 10pm"
            value={formData.opening_hours}
            onChangeText={(v) => updateField('opening_hours', v)}
            icon="time"
          />

          <Button
            title="Register Restaurant"
            onPress={handleSubmit}
            loading={loading}
            size="large"
            variant="secondary"
            style={styles.submitButton}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  imagePickerLarge: {
    height: 180,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
  },
  imagePlaceholderText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cuisineChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cuisineChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  cuisineText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  cuisineTextActive: {
    color: COLORS.white,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
});

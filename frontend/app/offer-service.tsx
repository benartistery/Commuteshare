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

const serviceTypes = [
  { id: 'makeup', name: 'Makeup & Beauty', icon: 'color-palette' },
  { id: 'photography', name: 'Photography', icon: 'camera' },
  { id: 'project_writing', name: 'Project Writing', icon: 'document-text' },
  { id: 'topic_verification', name: 'Topic Verification', icon: 'checkmark-circle' },
  { id: 'tutoring', name: 'Tutoring', icon: 'school' },
  { id: 'other', name: 'Other Services', icon: 'construct' },
];

export default function OfferServiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    service_type: '',
    duration: '',
    location: '',
    availability: '',
  });
  const [images, setImages] = useState<string[]>([]);

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
      setImages(prev => [...prev, base64Image]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.service_type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/services', {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        service_type: formData.service_type,
        duration: formData.duration || null,
        location: formData.location || null,
        availability: formData.availability || null,
        images: images,
      });
      Alert.alert('Success', 'Service listed successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create service');
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
          <Text style={styles.headerTitle}>Offer a Service</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Service Type */}
          <Text style={styles.label}>Service Type *</Text>
          <View style={styles.typesGrid}>
            {serviceTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  formData.service_type === type.id && styles.typeCardActive,
                ]}
                onPress={() => updateField('service_type', type.id)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={formData.service_type === type.id ? COLORS.accent : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.typeText,
                    formData.service_type === type.id && styles.typeTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Portfolio Images */}
          <Text style={styles.label}>Portfolio (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: img }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImage} onPress={pickImage}>
                <Ionicons name="images" size={32} color={COLORS.textMuted} />
                <Text style={styles.addImageText}>Add Work Sample</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Input
            label="Service Title *"
            placeholder="e.g., Professional Makeup for Events"
            value={formData.title}
            onChangeText={(v) => updateField('title', v)}
          />

          <Input
            label="Description"
            placeholder="Describe your service, experience, and what you offer"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={4}
          />

          <Input
            label="Price (₦) *"
            placeholder="Enter your rate"
            value={formData.price}
            onChangeText={(v) => updateField('price', v)}
            keyboardType="numeric"
            icon="pricetag"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Duration"
                placeholder="e.g., 2 hours"
                value={formData.duration}
                onChangeText={(v) => updateField('duration', v)}
                icon="time"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Location"
                placeholder="On-site / Remote"
                value={formData.location}
                onChangeText={(v) => updateField('location', v)}
                icon="location"
              />
            </View>
          </View>

          <Input
            label="Availability"
            placeholder="e.g., Weekdays 9am-5pm"
            value={formData.availability}
            onChangeText={(v) => updateField('availability', v)}
            icon="calendar"
          />

          <Button
            title="Publish Service"
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
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  typeCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  typeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  typeTextActive: {
    color: COLORS.accent,
    fontWeight: '500',
  },
  imagesRow: {
    marginBottom: SPACING.md,
  },
  imageContainer: {
    width: 120,
    height: 80,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImage: {
    width: 120,
    height: 80,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
});

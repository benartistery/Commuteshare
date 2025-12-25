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
import { Card } from '../src/components/common/Card';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/theme';
import api from '../src/api/client';

const categories = [
  { id: 'electronics', name: 'Electronics', icon: 'laptop' },
  { id: 'fashion', name: 'Fashion', icon: 'shirt' },
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'furniture', name: 'Furniture', icon: 'bed' },
  { id: 'food', name: 'Food', icon: 'restaurant' },
  { id: 'other', name: 'Other', icon: 'cube' },
];

const conditions = [
  { id: 'new', name: 'Brand New' },
  { id: 'like_new', name: 'Like New' },
  { id: 'good', name: 'Good' },
  { id: 'fair', name: 'Fair' },
];

export default function CreateListingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'new',
    quantity: '1',
    location: '',
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
      aspect: [1, 1],
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
    if (!formData.title || !formData.price || !formData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/products', {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        quantity: parseInt(formData.quantity) || 1,
        location: formData.location,
        images: images,
      });
      Alert.alert('Success', 'Product listed successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create listing');
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
          <Text style={styles.headerTitle}>Create Listing</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Images */}
          <Text style={styles.label}>Photos</Text>
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
                <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Input
            label="Title *"
            placeholder="What are you selling?"
            value={formData.title}
            onChangeText={(v) => updateField('title', v)}
          />

          <Input
            label="Description"
            placeholder="Describe your item"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={4}
          />

          <Input
            label="Price (₦) *"
            placeholder="Enter price"
            value={formData.price}
            onChangeText={(v) => updateField('price', v)}
            keyboardType="numeric"
            icon="pricetag"
          />

          {/* Category */}
          <Text style={styles.label}>Category *</Text>
          <View style={styles.optionsGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.optionCard,
                  formData.category === cat.id && styles.optionCardActive,
                ]}
                onPress={() => updateField('category', cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={formData.category === cat.id ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.optionText,
                    formData.category === cat.id && styles.optionTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Condition */}
          <Text style={styles.label}>Condition</Text>
          <View style={styles.conditionsRow}>
            {conditions.map((cond) => (
              <TouchableOpacity
                key={cond.id}
                style={[
                  styles.conditionChip,
                  formData.condition === cond.id && styles.conditionChipActive,
                ]}
                onPress={() => updateField('condition', cond.id)}
              >
                <Text
                  style={[
                    styles.conditionText,
                    formData.condition === cond.id && styles.conditionTextActive,
                  ]}
                >
                  {cond.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Quantity"
                placeholder="1"
                value={formData.quantity}
                onChangeText={(v) => updateField('quantity', v)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Location"
                placeholder="Campus, Hostel"
                value={formData.location}
                onChangeText={(v) => updateField('location', v)}
              />
            </View>
          </View>

          <Button
            title="Publish Listing"
            onPress={handleSubmit}
            loading={loading}
            size="large"
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
  imagesRow: {
    marginBottom: SPACING.md,
  },
  imageContainer: {
    width: 100,
    height: 100,
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
    width: 100,
    height: 100,
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  conditionChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conditionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  conditionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  conditionTextActive: {
    color: COLORS.white,
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

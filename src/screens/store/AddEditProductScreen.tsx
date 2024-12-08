import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { StoreProduct } from '../../types';

interface AddEditProductScreenProps {
  navigation: any;
  route: {
    params: {
      storeId: string;
      productId?: string;
    };
  };
}

const CONDITIONS = ['new', 'like-new', 'good', 'fair'] as const;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CATEGORIES = [
  'Vêtements',
  'Chaussures',
  'Accessoires',
  'Sacs',
  'Bijoux',
  'Sport',
  'Vintage',
];

export const AddEditProductScreen = ({ navigation, route }: AddEditProductScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [productData, setProductData] = useState<Partial<StoreProduct>>({
    name: '',
    description: '',
    price: 0,
    compareAtPrice: undefined,
    category: '',
    subcategory: '',
    brand: '',
    condition: 'new',
    sizes: [],
    colors: [],
    stock: 0,
    status: 'draft',
    tags: [],
    specifications: {},
    measurements: {},
  });

  useEffect(() => {
    if (route.params.productId) {
      fetchProduct();
    }
  }, []);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const productDoc = await getDoc(
        doc(db, 'products', route.params.productId!)
      );
      if (productDoc.exists()) {
        const data = productDoc.data() as StoreProduct;
        setProductData(data);
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Erreur', 'Impossible de charger le produit');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadImages = async () => {
    const uploadedUrls: string[] = [];
    for (const image of images) {
      if (image.startsWith('http')) {
        uploadedUrls.push(image);
        continue;
      }

      const response = await fetch(image);
      const blob = await response.blob();
      const imageName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const imageRef = ref(
        storage,
        `products/${route.params.storeId}/${imageName}`
      );
      await uploadBytes(imageRef, blob);
      const url = await getDownloadURL(imageRef);
      uploadedUrls.push(url);
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    try {
      if (!productData.name?.trim()) {
        Alert.alert('Erreur', 'Le nom du produit est obligatoire');
        return;
      }

      if (!productData.price || productData.price <= 0) {
        Alert.alert('Erreur', 'Le prix doit être supérieur à 0');
        return;
      }

      if (images.length === 0) {
        Alert.alert('Erreur', 'Ajoutez au moins une image');
        return;
      }

      setSaving(true);
      const uploadedImages = await uploadImages();

      const productId = route.params.productId || doc(db, 'products').id;
      const product: StoreProduct = {
        id: productId,
        storeId: route.params.storeId,
        images: uploadedImages,
        createdAt: route.params.productId ? productData.createdAt! : Date.now(),
        updatedAt: Date.now(),
        ...productData,
      } as StoreProduct;

      if (route.params.productId) {
        await updateDoc(doc(db, 'products', productId), product);
      } else {
        await setDoc(doc(db, 'products', productId), product);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {route.params.productId ? 'Modifier le produit' : 'Nouveau produit'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.saveButton}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.label}>Images du produit</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
          >
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleImagePick}
            >
              <Ionicons name="add" size={40} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Nom du produit *</Text>
          <TextInput
            style={styles.input}
            value={productData.name}
            onChangeText={(text) => setProductData((prev) => ({ ...prev, name: text }))}
            placeholder="Nom du produit"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={productData.description}
            onChangeText={(text) => setProductData((prev) => ({ ...prev, description: text }))}
            placeholder="Description du produit"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Pricing */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Prix *</Text>
            <TextInput
              style={styles.input}
              value={productData.price?.toString()}
              onChangeText={(text) => {
                const price = parseFloat(text) || 0;
                setProductData((prev) => ({ ...prev, price }));
              }}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.section, { flex: 1, marginLeft: theme.spacing.md }]}>
            <Text style={styles.label}>Prix barré</Text>
            <TextInput
              style={styles.input}
              value={productData.compareAtPrice?.toString()}
              onChangeText={(text) => {
                const compareAtPrice = parseFloat(text) || undefined;
                setProductData((prev) => ({ ...prev, compareAtPrice }));
              }}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Catégorie</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.tag,
                  productData.category === category && styles.selectedTag,
                ]}
                onPress={() => setProductData((prev) => ({ ...prev, category }))}
              >
                <Text
                  style={[
                    styles.tagText,
                    productData.category === category && styles.selectedTagText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sizes */}
        <View style={styles.section}>
          <Text style={styles.label}>Tailles disponibles</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.tag,
                  productData.sizes?.includes(size) && styles.selectedTag,
                ]}
                onPress={() => {
                  setProductData((prev) => ({
                    ...prev,
                    sizes: prev.sizes?.includes(size)
                      ? prev.sizes.filter((s) => s !== size)
                      : [...(prev.sizes || []), size],
                  }));
                }}
              >
                <Text
                  style={[
                    styles.tagText,
                    productData.sizes?.includes(size) && styles.selectedTagText,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.label}>État</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {CONDITIONS.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.tag,
                  productData.condition === condition && styles.selectedTag,
                ]}
                onPress={() => setProductData((prev) => ({ ...prev, condition }))}
              >
                <Text
                  style={[
                    styles.tagText,
                    productData.condition === condition && styles.selectedTagText,
                  ]}
                >
                  {condition === 'new'
                    ? 'Neuf'
                    : condition === 'like-new'
                    ? 'Comme neuf'
                    : condition === 'good'
                    ? 'Bon état'
                    : 'Correct'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stock */}
        <View style={styles.section}>
          <Text style={styles.label}>Stock disponible</Text>
          <TextInput
            style={styles.input}
            value={productData.stock?.toString()}
            onChangeText={(text) => {
              const stock = parseInt(text) || 0;
              setProductData((prev) => ({ ...prev, stock }));
            }}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveButton: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginHorizontal: theme.spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.xs,
  },
  tag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    marginHorizontal: theme.spacing.xs,
  },
  selectedTag: {
    backgroundColor: theme.colors.primary,
  },
  tagText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedTagText: {
    color: 'white',
  },
});

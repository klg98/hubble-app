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
import { doc, setDoc, getDoc, updateDoc, increment, runTransaction, collection } from 'firebase/firestore';
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
const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const NUMBER_SIZES = ['27', '28', '30', '32', '33', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52'];
const CATEGORIES = [
  'Chemises',
  'Polos',
  'T-Shirts',
  'Pulls',
  'Jeans',
  'Pantalons',
  'Culottes',
  'Sous-vêtements',
  'Robes',
  'Jupes',
  'Combinaisons',
  'Vestes',
  'Chaussures',
  'Accessoires',
  'Sacs',
  'Bijoux',
  'Sport',
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
  const [sizeType, setSizeType] = useState<'letter' | 'number' | null>(null);

  useEffect(() => {
    if (route.params.productId) {
      fetchProduct();
    }
  }, []);

  useEffect(() => {
    if (productData.sizes && productData.sizes.length > 0) {
      if (LETTER_SIZES.includes(productData.sizes[0])) {
        setSizeType('letter');
      } else if (NUMBER_SIZES.includes(productData.sizes[0])) {
        setSizeType('number');
      }
    }
  }, [productData.sizes]);

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
      // Validation du nom
      if (!productData.name?.trim()) {
        Alert.alert('Erreur', 'Le nom du produit est obligatoire');
        return;
      }

      // Validation du prix
      if (!productData.price || productData.price <= 0) {
        Alert.alert('Erreur', 'Le prix doit être supérieur à 0');
        return;
      }

      // Validation des images
      if (images.length === 0) {
        Alert.alert('Erreur', 'Vous devez ajouter au moins une image');
        return;
      }

      // Validation de la catégorie
      if (!productData.category) {
        Alert.alert('Erreur', 'Vous devez sélectionner une catégorie');
        return;
      }

      // Validation des tailles
      if (!productData.sizes || productData.sizes.length === 0) {
        Alert.alert('Erreur', 'Vous devez sélectionner au moins une taille');
        return;
      }

      // Validation du stock
      if (!productData.stock || productData.stock <= 0) {
        Alert.alert('Erreur', 'Le stock disponible doit être supérieur à 0');
        return;
      }

      setSaving(true);
      const uploadedImages = await uploadImages();

      // Créer une référence correcte pour un nouveau document
      const productId = route.params.productId || doc(collection(db, 'products')).id;

      // Nettoyer les données du produit en retirant les valeurs undefined
      const cleanProductData = Object.fromEntries(
        Object.entries({
          ...productData,
          id: productId,
          storeId: route.params.storeId,
          images: uploadedImages,
          createdAt: route.params.productId ? productData.createdAt! : Date.now(),
          updatedAt: Date.now(),
        }).filter(([_, value]) => value !== undefined)
      );

      // Utiliser une transaction pour garantir la cohérence des données
      await runTransaction(db, async (transaction) => {
        // Mise à jour ou création du produit
        const productRef = doc(db, 'products', productId);
        if (route.params.productId) {
          transaction.update(productRef, cleanProductData);
        } else {
          transaction.set(productRef, cleanProductData);
          // Incrémenter totalProducts uniquement lors de la création d'un nouveau produit
          const storeRef = doc(db, 'stores', route.params.storeId);
          transaction.update(storeRef, {
            totalProducts: increment(1)
          });
        }
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    } finally {
      setSaving(false);
    }
  };

  const handleSizeSelect = (size: string, type: 'letter' | 'number') => {
    if (sizeType && sizeType !== type) {
      // Si on change de type de taille, on réinitialise la sélection
      setProductData(prev => ({
        ...prev,
        sizes: [size],
      }));
      setSizeType(type);
    } else {
      setProductData(prev => {
        const newSizes = prev.sizes?.includes(size)
          ? prev.sizes.filter(s => s !== size)
          : [...(prev.sizes || []), size];
        
        // Si on désélectionne toutes les tailles, on réinitialise le type
        if (newSizes.length === 0) {
          setSizeType(null);
        } else if (!sizeType) {
          setSizeType(type);
        }
        
        return {
          ...prev,
          sizes: newSizes,
        };
      });
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
          <Text style={styles.label}>Images du produit *</Text>
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
          <Text style={styles.label}>Catégorie *</Text>
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
          <Text style={styles.label}>Tailles disponibles *</Text>
          <View>
            <Text style={styles.subLabel}>Tailles lettres</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsContainer}
            >
              {LETTER_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.tag,
                    productData.sizes?.includes(size) && styles.selectedTag,
                    (!sizeType || sizeType === 'letter') ? {} : styles.disabledTag,
                  ]}
                  onPress={() => handleSizeSelect(size, 'letter')}
                  disabled={sizeType === 'number'}
                >
                  <Text
                    style={[
                      styles.tagText,
                      productData.sizes?.includes(size) && styles.selectedTagText,
                      sizeType === 'number' && styles.disabledTagText,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.subLabel, { marginTop: theme.spacing.md }]}>Tailles chiffres</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsContainer}
            >
              {NUMBER_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.tag,
                    productData.sizes?.includes(size) && styles.selectedTag,
                    (!sizeType || sizeType === 'number') ? {} : styles.disabledTag,
                  ]}
                  onPress={() => handleSizeSelect(size, 'number')}
                  disabled={sizeType === 'letter'}
                >
                  <Text
                    style={[
                      styles.tagText,
                      productData.sizes?.includes(size) && styles.selectedTagText,
                      sizeType === 'letter' && styles.disabledTagText,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
          <Text style={styles.label}>Stock disponible *</Text>
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
  subLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  disabledTag: {
    backgroundColor: theme.colors.background,
    opacity: 0.5,
  },
  disabledTagText: {
    color: theme.colors.textSecondary,
  },
});

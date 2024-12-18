import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, query, collection, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { Product, Size } from '../../types';
import { theme } from '../../theme/theme';
import { Button } from '../../components/common/Button';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width;

interface ProductDetailsScreenProps {
  route: { params: { productId: string } };
  navigation: any;
}

export const ProductDetailsScreen = ({ route, navigation }: ProductDetailsScreenProps) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isInCart, setIsInCart] = useState(false);
  const [cartItemId, setCartItemId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProduct();
    checkIfInCart();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        setProduct({ id: productDoc.id, ...productDoc.data() } as Product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfInCart = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const cartQuery = query(
        collection(db, 'cart'),
        where('userId', '==', userId),
        where('productId', '==', productId)
      );
      const cartSnapshot = await getDocs(cartQuery);
      
      if (!cartSnapshot.empty) {
        const cartItem = cartSnapshot.docs[0];
        setIsInCart(true);
        setCartItemId(cartItem.id);
      } else {
        setIsInCart(false);
        setCartItemId(null);
      }
    } catch (error) {
      console.error('Error checking cart:', error);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const getConditionText = (condition: string) => {
    const conditions = {
      'new': 'Neuf',
      'like-new': 'Comme neuf',
      'good': 'Bon état',
      'fair': 'État correct',
    };
    return conditions[condition as keyof typeof conditions] || condition;
  };

  const renderSizeButton = (size: Size) => (
    <TouchableOpacity
      key={size}
      style={[
        styles.sizeButton,
        selectedSize === size && styles.selectedSizeButton,
      ]}
      onPress={() => setSelectedSize(size)}
    >
      <Text style={[
        styles.sizeButtonText,
        selectedSize === size && styles.selectedSizeButtonText,
      ]}>
        {size}
      </Text>
    </TouchableOpacity>
  );

  const handleAddToCart = async () => {
    try {
      if (!selectedSize) {
        Alert.alert('Erreur', 'Veuillez sélectionner une taille');
        return;
      }

      setUpdating(true);
      const userId = auth.currentUser?.uid;
      if (!userId || !product) return;

      if (isInCart && cartItemId) {
        // Retirer du panier
        await deleteDoc(doc(db, 'cart', cartItemId));
        setIsInCart(false);
        setCartItemId(null);
        Alert.alert('Succès', 'Produit retiré du panier');
      } else {
        // Ajouter au panier
        const cartRef = collection(db, 'cart');
        const cartItem = {
          userId,
          productId: product.id,
          storeId: product.storeId,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          size: selectedSize,
          quantity: 1,
          addedAt: Date.now(),
          updatedAt: Date.now()
        };

        const docRef = await addDoc(cartRef, cartItem);
        setIsInCart(true);
        setCartItemId(docRef.id);
        Alert.alert('Succès', 'Produit ajouté au panier');
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le panier');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text>Produit non trouvé</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Images Carousel */}
        <View style={styles.imageContainer}>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
              />
            )}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          {/* Image Pagination */}
          <View style={styles.pagination}>
            {product.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentImageIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Product Info */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
          </View>

          <View style={styles.condition}>
            <Text style={styles.conditionText}>
              État : {getConditionText(product.condition)}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Sizes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tailles disponibles</Text>
            <View style={styles.sizesContainer}>
              {product.sizes.map(renderSizeButton)}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={styles.footer}>
        <Button
          onPress={handleAddToCart}
          style={styles.addToCartButton}
          loading={updating}
        >
          <Text style={styles.addToCartButtonText}>
            {isInCart ? 'Retirer du panier' : 'Ajouter au panier'}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  image: {
    width,
    height: IMAGE_HEIGHT,
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: 'white',
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  brand: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  condition: {
    backgroundColor: theme.colors.primary + '15',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  conditionText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  sizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sizeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 48,
    alignItems: 'center',
  },
  selectedSizeButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sizeButtonText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedSizeButtonText: {
    color: 'white',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: 'white',
  },
  addToCartButton: {
    width: '100%',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Store, StoreProduct } from '../../types';
import { ProductCard } from '../../components/common/ProductCard';

interface StoreProfileScreenProps {
  navigation: any;
  route: {
    params: {
      storeId: string;
    };
  };
}

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - theme.spacing.lg * 3) / 2;

export const StoreProfileScreen = ({ navigation, route }: StoreProfileScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchStoreData();
    checkIfFollowing();
  }, []);

  const fetchStoreData = async () => {
    try {
      const storeDoc = await getDoc(doc(db, 'stores', route.params.storeId));
      if (storeDoc.exists()) {
        setStore(storeDoc.data() as Store);
      }

      // Fetch store products
      const productsQuery = query(
        collection(db, 'products'),
        where('storeId', '==', route.params.storeId),
        where('status', '==', 'active')
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoreProduct[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFollowing = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setIsFollowing(userData.followingStores?.includes(route.params.storeId) || false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        navigation.navigate('Auth');
        return;
      }

      const userRef = doc(db, 'users', userId);
      const storeRef = doc(db, 'stores', route.params.storeId);

      if (isFollowing) {
        await updateDoc(userRef, {
          followingStores: arrayRemove(route.params.storeId)
        });
        await updateDoc(storeRef, {
          followers: increment(-1)
        });
      } else {
        await updateDoc(userRef, {
          followingStores: arrayUnion(route.params.storeId)
        });
        await updateDoc(storeRef, {
          followers: increment(1)
        });
      }

      setIsFollowing(!isFollowing);
      if (store) {
        setStore({
          ...store,
          followers: store.followers + (isFollowing ? -1 : 1)
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Boutique introuvable</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header with Banner */}
        <View style={styles.bannerContainer}>
          {store.bannerImage ? (
            <Image source={{ uri: store.bannerImage }} style={styles.banner} />
          ) : (
            <View style={styles.bannerPlaceholder} />
          )}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Store Info */}
        <View style={styles.storeInfo}>
          <View style={styles.logoContainer}>
            {store.logo ? (
              <Image source={{ uri: store.logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront" size={32} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.nameContainer}>
              <Text style={styles.storeName}>{store.name}</Text>
              {store.isVerified && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </View>

            <Text style={styles.location}>{store.location}</Text>

            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{store.followers}</Text>
                <Text style={styles.statLabel}>Abonnés</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{store.metrics.totalProducts}</Text>
                <Text style={styles.statLabel}>Produits</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{store.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Note</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Abonné' : 'Suivre'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.description}>{store.description}</Text>
          </View>
        </View>

        {/* Products */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Produits</Text>
          <FlatList
            data={products}
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} />
              </View>
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.productsGrid}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
  },
  bannerContainer: {
    height: 200,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
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
  storeInfo: {
    padding: theme.spacing.lg,
    marginTop: -40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    marginTop: theme.spacing.md,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  location: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  stat: {
    marginRight: theme.spacing.xl,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  followingButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: theme.colors.primary,
  },
  description: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  productsContainer: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  productsGrid: {
    marginHorizontal: -theme.spacing.sm,
  },
  productCard: {
    width: PRODUCT_WIDTH,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
});

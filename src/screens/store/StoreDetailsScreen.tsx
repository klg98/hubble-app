import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Store, Product } from '../../types';
import { ProductCard } from '../../components/common/ProductCard';
import { theme } from '../../theme/theme';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 250;

export const StoreDetailsScreen = ({ route, navigation }: any) => {
  const { storeId } = route.params;
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showOwnerBio, setShowOwnerBio] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.toLocaleString('fr-FR', { month: 'long' });
    return `créé en ${month} ${date.getFullYear()}`;
  };

  const checkIfFollowing = async () => {
    if (!auth.currentUser) return;
    try {
      const followDoc = await getDoc(
        doc(db, 'followers', `${auth.currentUser.uid}_${storeId}`)
      );
      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!auth.currentUser) return;
    setLoadingFollow(true);

    const followerId = auth.currentUser.uid;
    const followDoc = doc(db, 'followers', `${followerId}_${storeId}`);

    try {
      if (isFollowing) {
        await deleteDoc(followDoc);
        if (store) setStore({ ...store, followers: store.followers - 1 });
      } else {
        await setDoc(followDoc, {
          userId: followerId,
          storeId: storeId,
          createdAt: Date.now()
        });
        if (store) setStore({ ...store, followers: store.followers + 1 });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following store:', error);
    } finally {
      setLoadingFollow(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch store details
      const storeDoc = await getDoc(doc(db, 'stores', storeId));
      if (storeDoc.exists()) {
        setStore({ id: storeDoc.id, ...storeDoc.data() } as Store);
      }

      // Fetch store products
      const productsQuery = query(
        collection(db, 'products'),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);

      await checkIfFollowing();
    } catch (error) {
      console.error('Error fetching store details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
        <Text>Boutique non trouvée</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickyHeaderIndices={[1]}
      >
        {/* Header Image */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: store.imageUrl }}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Store Info Header */}
        <View style={styles.storeInfoHeader}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.storeHandle}>@{store.handle}</Text>
            <Text style={styles.storeDate}>{formatDate(store.createdAt)}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                loadingFollow && styles.loadingButton
              ]}
              onPress={handleFollow}
              disabled={loadingFollow}
            >
              <Text style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText
              ]}>
                {isFollowing ? 'Fidélisé' : 'Se fidéliser'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ownerButton}
              onPress={() => setShowOwnerBio(true)}
            >
              <Text style={styles.ownerButtonText}>Propriétaire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{store.description}</Text>
        </View>

        {/* Store Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{store.products}</Text>
            <Text style={styles.statLabel}>Articles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{store.followers}</Text>
            <Text style={styles.statLabel}>Fidèles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{store.following}</Text>
            <Text style={styles.statLabel}>Fidélisations</Text>
          </View>
        </View>

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>Articles</Text>
          <View style={styles.productsGrid}>
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Owner Bio Modal */}
      <Modal
        visible={showOwnerBio}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOwnerBio(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>À propos du propriétaire</Text>
            <Text style={styles.modalText}>{store.ownerBio || 'Aucune biographie disponible.'}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowOwnerBio(false)}
            >
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
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
  storeInfoHeader: {
    backgroundColor: 'white',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  storeInfo: {
    marginBottom: theme.spacing.md,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  storeHandle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  storeDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  followButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: theme.colors.secondary,
  },
  loadingButton: {
    opacity: 0.7,
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: 'white',
  },
  ownerButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ownerButtonText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  productsContainer: {
    padding: theme.spacing.lg,
  },
  productsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

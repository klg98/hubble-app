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
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          
          <View style={styles.headerRightButtons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="scan-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="search" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {store.bannerImage ? (
            <Image
              source={{ uri: store.bannerImage }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.spacer} />
          )}

          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{ uri: store.logo }}
                  style={styles.profileImage}
                />
              </View>
            </View>

            <View style={styles.storeInfoSection}>
              <View style={styles.nameSection}>
                <Text style={styles.name}>{store.name}</Text>
                <Text style={styles.username}>@{store.username}</Text>
                <Text style={styles.creationDate}>
                  {formatDate(store.createdAt)}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton
                  ]}
                  onPress={handleFollow}
                  disabled={loading}
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

              <Text style={styles.description}>{store.description}</Text>

              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{store.metrics.totalProducts}</Text>
                  <Text style={styles.statLabel}>Articles</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{store.followers}</Text>
                  <Text style={styles.statLabel}>Fidèles</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{store.following}</Text>
                  <Text style={styles.statLabel}>Fidélisations</Text>
                </View>
              </View>
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
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 50,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  spacer: {
    height: 40,
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  profileSection: {
    padding: 15,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  profileImageContainer: {
    marginTop: -40,
    backgroundColor: 'white',
    padding: 3,
    borderRadius: 44,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignSelf: 'flex-start',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
  },
  storeInfoSection: {
    marginTop: 10,
  },
  nameSection: {
    marginBottom: 15,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  creationDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
  },
  followingButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  followingButtonText: {
    color: theme.colors.primary,
  },
  ownerButton: {
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
  },
  ownerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
    marginBottom: 15,
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
  stat: {
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
});

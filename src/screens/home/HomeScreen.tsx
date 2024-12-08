import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Store, Product, StoreFollower } from '../../types';
import { StoreCard } from '../../components/common/StoreCard';
import { ProductCard } from '../../components/common/ProductCard';
import { theme } from '../../theme/theme';

export const HomeScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popularStores, setPopularStores] = useState<Store[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [followedStores, setFollowedStores] = useState<string[]>([]);
  const [selectedOwnerBio, setSelectedOwnerBio] = useState<string | null>(null);

  const fetchFollowedStores = async () => {
    if (!auth.currentUser) return;
    
    try {
      const followersRef = collection(db, 'followers');
      const q = query(
        followersRef,
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const storeIds = snapshot.docs.map(doc => doc.data().storeId);
      setFollowedStores(storeIds);
    } catch (error) {
      console.error('Error fetching followed stores:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch popular stores
      const storesQuery = query(
        collection(db, 'stores'),
        orderBy('followers', 'desc'),
        limit(5)
      );
      const storesSnapshot = await getDocs(storesQuery);
      const storesData = await Promise.all(storesSnapshot.docs.map(async doc => {
        // Fetch recent products for each store
        const productsQuery = query(
          collection(db, 'products'),
          where('storeId', '==', doc.id),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const recentProducts = productsSnapshot.docs.map(
          productDoc => productDoc.data().images[0]
        );

        return {
          id: doc.id,
          ...doc.data(),
          recentProducts
        } as Store;
      }));
      setPopularStores(storesData);

      // Fetch recent products
      const productsQuery = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        limit(6)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setRecentProducts(productsData);

      await fetchFollowedStores();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.logo}>HUBBLE</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boutiques Populaires</Text>
          {popularStores.map(store => (
            <StoreCard
              key={store.id}
              store={store}
              onPress={() => navigation.navigate('StoreDetails', { storeId: store.id })}
              onOwnerPress={() => setSelectedOwnerBio(store.ownerBio || null)}
              isFollowing={followedStores.includes(store.id)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produits Récents</Text>
          <View style={styles.productsGrid}>
            {recentProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedOwnerBio}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOwnerBio(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>À propos du propriétaire</Text>
            <Text style={styles.modalText}>{selectedOwnerBio}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSelectedOwnerBio(null)}
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
  header: {
    padding: theme.spacing.lg,
    backgroundColor: 'white',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Product, Store } from '../../types';
import { ProductCard } from '../../components/common/ProductCard';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export const StoreProductsScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    fetchStoreAndProducts();
  }, []);

  const fetchStoreAndProducts = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Récupérer le storeId depuis le contexte de l'utilisateur
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        Alert.alert('Erreur', 'Utilisateur introuvable');
        return;
      }
      const userData = userDoc.data();
      const userStoreId = userData.storeId;

      if (!userStoreId) {
        Alert.alert('Erreur', 'Aucune boutique associée à votre compte');
        return;
      }

      // Récupérer les détails du magasin
      const storeDoc = await getDoc(doc(db, 'stores', userStoreId));
      if (!storeDoc.exists()) {
        Alert.alert('Erreur', 'Boutique introuvable');
        return;
      }
      const storeData = { id: storeDoc.id, ...storeDoc.data() } as Store;
      setStore(storeData);

      // Récupérer les produits
      const productsQuery = query(
        collection(db, 'products'),
        where('storeId', '==', userStoreId)
      );
      const productsSnap = await getDocs(productsQuery);
      const productsData = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching store and products:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      Alert.alert(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer ce produit ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              await deleteDoc(doc(db, 'products', productId));
              setProducts(prev => prev.filter(p => p.id !== productId));
              Alert.alert('Succès', 'Produit supprimé avec succès');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le produit');
    }
  };

  const handleEditProduct = (product: Product) => {
    navigation.navigate('EditProduct', { product });
  };

  const handleAddProduct = () => {
    navigation.navigate('AddEditProduct', { storeId: store?.id });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
      onEdit={() => handleEditProduct(item)}
      onDelete={() => handleDeleteProduct(item.id)}
      showActions
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Aucun produit dans votre boutique</Text>
      <Text style={styles.emptySubtext}>
        Commencez à ajouter des produits pour les vendre
      </Text>
      <Button
        onPress={handleAddProduct}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>Ajouter un produit</Text>
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchStoreAndProducts}
          />
        }
        ListEmptyComponent={renderEmptyState()}
      />
      
      {products.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});

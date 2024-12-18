import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  increment,
  arrayUnion,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { CartItem, Product, StoreOrder, Order, OrderItem } from '../../types';
import { CartItemComponent } from '../../components/cart/CartItem';
import { Button } from '../../components/common/Button';

// Fonction de génération d'ID unique
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

export const CartScreen = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Recharger le panier quand l'écran est focalisé
  useFocusEffect(
    React.useCallback(() => {
      fetchCartItems();
    }, [])
  );

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const cartQuery = query(
        collection(db, 'cart'),
        where('userId', '==', userId)
      );
      const cartSnapshot = await getDocs(cartQuery);
      const items = cartSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CartItem[];

      setCartItems(items);
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Erreur', 'Impossible de charger votre panier');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      setUpdating(true);
      const cartItem = cartItems.find(item => item.id === itemId);
      if (!cartItem) return;

      // Vérifier le stock disponible
      const productDoc = await getDoc(doc(db, 'products', cartItem.productId));
      if (!productDoc.exists()) {
        Alert.alert('Erreur', 'Produit non trouvé');
        return;
      }

      const product = productDoc.data() as Product;
      if (quantity > product.stock) {
        Alert.alert('Stock insuffisant', `Il ne reste que ${product.stock} unité(s) en stock.`);
        return;
      }

      await updateDoc(doc(db, 'cart', itemId), { 
        quantity,
        updatedAt: Date.now()
      });
      
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la quantité');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdating(true);
      await deleteDoc(doc(db, 'cart', itemId));
      setCartItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Erreur', 'Impossible de supprimer l\'article');
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const handleCreateOrder = async () => {
    try {
      if (!auth.currentUser) return;
      setUpdating(true);

      // Récupérer les informations de l'utilisateur
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists()) {
        Alert.alert('Erreur', 'Informations utilisateur introuvables');
        return;
      }
      const userData = userDoc.data();

      // Créer une nouvelle commande principale
      const orderId = generateId();
      const orderRef = doc(db, 'orders', orderId);
      
      // Préparer les commandes par magasin
      const storeOrders: { [storeId: string]: StoreOrder } = {};
      const batch = writeBatch(db);

      // Créer les commandes pour chaque magasin
      for (const item of cartItems) {
        const storeOrderId = generateId();
        const storeOrderRef = doc(db, 'storeOrders', storeOrderId);
        
        const orderItem: OrderItem = {
          ...item,
          productName: item.name,
          productImage: item.image,
        };

        const storeOrder: StoreOrder = {
          id: storeOrderId,
          orderId,
          storeId: item.storeId,
          userId: auth.currentUser.uid,
          items: [orderItem],
          status: 'pending',
          subtotal: item.price * item.quantity,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          customerInfo: {
            name: userData.displayName || '',
            phone: userData.phone || '',
            email: userData.email || '',
            address: userData.address || '',
            location: userData.location || null,
          },
        };

        storeOrders[item.storeId] = storeOrder;
        batch.set(storeOrderRef, storeOrder);
      }

      // Créer la commande principale
      const order: Order = {
        id: orderId,
        userId: auth.currentUser.uid,
        ordersByStore: storeOrders,
        totalAmount: calculateTotal(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'pending'
      };

      batch.set(orderRef, order);

      // Supprimer les articles du panier
      for (const item of cartItems) {
        batch.delete(doc(db, 'cart', item.id));
      }

      // Exécuter toutes les opérations de base
      await batch.commit();

      // Mettre à jour les métriques des magasins
      await Promise.all(
        Object.entries(storeOrders).map(async ([storeId, storeOrder]) => {
          const metricsRef = doc(db, 'stores', storeId, 'metrics', 'latest');
          
          // Vérifier si le document metrics existe
          const metricsDoc = await getDoc(metricsRef);
          
          if (!metricsDoc.exists()) {
            // Créer le document metrics s'il n'existe pas
            await setDoc(metricsRef, {
              pendingOrders: 1,
              totalOrders: 1,
              totalSales: storeOrder.subtotal,
              recentOrders: [{
                id: storeOrder.id,
                orderId: storeOrder.orderId,
                amount: storeOrder.subtotal,
                createdAt: storeOrder.createdAt,
                status: storeOrder.status,
              }],
              updatedAt: Date.now()
            });
          } else {
            // Mettre à jour le document existant
            await updateDoc(metricsRef, {
              pendingOrders: increment(1),
              totalOrders: increment(1),
              totalSales: increment(storeOrder.subtotal),
              recentOrders: arrayUnion({
                id: storeOrder.id,
                orderId: storeOrder.orderId,
                amount: storeOrder.subtotal,
                createdAt: storeOrder.createdAt,
                status: storeOrder.status,
              }),
              updatedAt: Date.now()
            });
          }
        })
      );

      // Vider le panier local
      setCartItems([]);
      Alert.alert('Succès', 'Votre commande a été créée avec succès');

    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Erreur', 'Impossible de créer la commande');
    } finally {
      setUpdating(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <CartItemComponent
      key={item.id}
      item={item}
      onUpdateQuantity={handleUpdateQuantity}
      onRemove={handleRemoveItem}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Votre panier est vide</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={fetchCartItems}
          />
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                {formatPrice(calculateTotal())}
              </Text>
            </View>
            <Button
              onPress={handleCreateOrder}
              loading={updating}
              style={styles.checkoutButton}
            >
              <Text style={styles.checkoutButtonText}>
                Commander ({cartItems.length})
              </Text>
            </Button>
          </View>
        </>
      )}
    </SafeAreaView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  list: {
    padding: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  totalLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  checkoutButton: {
    backgroundColor: theme.colors.primary,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

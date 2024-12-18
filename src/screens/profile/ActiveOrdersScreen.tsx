import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Order } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export const ActiveOrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'processing', 'shipped']),
        orderBy('createdAt', 'desc')
      );

      const ordersSnap = await getDocs(ordersQuery);
      const ordersData = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Erreur', 'Impossible de charger les commandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'rgba(255, 193, 7, 0.2)'; // Jaune clair
      case 'processing':
        return 'rgba(33, 150, 243, 0.2)'; // Bleu clair
      case 'shipped':
        return 'rgba(76, 175, 80, 0.2)'; // Vert clair
      default:
        return theme.colors.background;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF8F00'; // Orange foncé
      case 'processing':
        return '#1565C0'; // Bleu foncé
      case 'shipped':
        return '#2E7D32'; // Vert foncé
      default:
        return theme.colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'processing':
        return 'bicycle-outline';
      case 'shipped':
        return 'checkmark-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'processing':
        return 'En cours de livraison';
      case 'shipped':
        return 'Délivré';
      default:
        return status;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Commande #{order.id.slice(-8)}</Text>
        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
      </View>

      {Object.entries(order.ordersByStore).map(([storeId, storeOrder]) => (
        <View key={storeId} style={styles.storeSection}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeName}>Vendeur #{storeId.slice(-8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(storeOrder.status) }]}>
              <Ionicons 
                name={getStatusIcon(storeOrder.status)} 
                size={16} 
                color={getStatusTextColor(storeOrder.status)}
                style={styles.statusIcon} 
              />
              <Text style={[styles.statusText, { color: getStatusTextColor(storeOrder.status) }]}>
                {getStatusText(storeOrder.status)}
              </Text>
            </View>
          </View>

          <FlatList
            data={storeOrder.items}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
                <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
            )}
            keyExtractor={item => item.productId}
          />
        </View>
      ))}

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatPrice(order.totalAmount)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune commande en cours</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.md,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  date: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  storeSection: {
    marginBottom: theme.spacing.md,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    width: 150,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

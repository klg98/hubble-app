import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { StoreOrder, OrderStatus } from '../../types';
import { Button } from '../../components/common/Button';
import { Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatPrice } from '../../utils/formatters';

export const StoreOrdersScreen = () => {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Récupérer le storeId depuis le document utilisateur
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        Alert.alert('Erreur', 'Utilisateur non trouvé');
        return;
      }
      const storeId = userDoc.data().storeId;
      if (!storeId) {
        Alert.alert('Erreur', 'Aucun magasin associé à cet utilisateur');
        return;
      }

      let ordersQuery = query(
        collection(db, 'storeOrders'),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );

      if (selectedStatus !== 'all') {
        ordersQuery = query(
          collection(db, 'storeOrders'),
          where('storeId', '==', storeId),
          where('status', '==', selectedStatus),
          orderBy('createdAt', 'desc')
        );
      }

      const ordersSnap = await getDocs(ordersQuery);
      const ordersData = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as StoreOrder[];

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Erreur', 'Impossible de charger les commandes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // Récupérer la commande du magasin pour obtenir l'orderId principal
      const storeOrderDoc = await getDoc(doc(db, 'storeOrders', orderId));
      if (!storeOrderDoc.exists()) {
        Alert.alert('Erreur', 'Commande introuvable');
        return;
      }
      const storeOrder = storeOrderDoc.data();
      const mainOrderId = storeOrder.orderId;

      // Mettre à jour le status dans storeOrders
      await updateDoc(doc(db, 'storeOrders', orderId), {
        status: newStatus,
        updatedAt: Date.now(),
      });

      // Récupérer la commande principale
      const mainOrderDoc = await getDoc(doc(db, 'orders', mainOrderId));
      if (!mainOrderDoc.exists()) {
        Alert.alert('Erreur', 'Commande principale introuvable');
        return;
      }
      const mainOrder = mainOrderDoc.data();

      // Mettre à jour le status de la commande du magasin dans la commande principale
      const updatedOrdersByStore = {
        ...mainOrder.ordersByStore,
        [storeOrder.storeId]: {
          ...mainOrder.ordersByStore[storeOrder.storeId],
          status: newStatus,
          updatedAt: Date.now(),
        },
      };

      // Mettre à jour la commande principale
      await updateDoc(doc(db, 'orders', mainOrderId), {
        ordersByStore: updatedOrdersByStore,
        updatedAt: Date.now(),
      });
      
      // Mettre à jour l'état local
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, updatedAt: Date.now() }
            : order
        )
      );
      
      Alert.alert('Succès', 'Statut de la commande mis à jour');
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return theme.colors.primary;
      case 'processing':
        return theme.colors.confirmed;
      case 'shipped':
        return theme.colors.dark;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'processing':
        return 'Confirmée';
      case 'shipped':
        return 'Prête';
      default:
        return status;
    }
  };

  const renderOrderItem = ({ item: order }: { item: StoreOrder }) => {
    const openLocation = () => {
      if (order.customerInfo?.location) {
        const { latitude, longitude } = order.customerInfo.location;
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(url);
      }
    };

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Commande #{order.orderId.slice(-8)}</Text>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
        </View>

        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Informations client</Text>
          <Text style={styles.customerInfo}>Nom: {order.customerInfo?.name}</Text>
          <Text style={styles.customerInfo}>Téléphone: {order.customerInfo?.phone}</Text>
          <Text style={styles.customerInfo}>Email: {order.customerInfo?.email}</Text>
          <Text style={styles.customerInfo}>Adresse: {order.customerInfo?.address}</Text>
          {order.customerInfo?.location && (
            <TouchableOpacity
              style={styles.locationButton}
              onPress={openLocation}
            >
              <Ionicons name="location" size={20} color="white" />
              <Text style={styles.locationButtonText}>Voir sur Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Articles commandés</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Statut:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
            </View>
          </View>

          <View style={styles.actionsSection}>
            {order.status === 'pending' && (
              <Button
                title="Accepter"
                onPress={() => handleUpdateStatus(order.id, 'processing')}
                style={[styles.actionButton, { backgroundColor: theme.colors.confirmed }]}
              />
            )}
            {order.status === 'processing' && (
              <Button
                title="Expédier"
                onPress={() => handleUpdateStatus(order.id, 'shipped')}
                style={[styles.actionButton, { backgroundColor: theme.colors.dark }]}
              />
            )}
          </View>
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatPrice(order.subtotal)}</Text>
        </View>
      </View>
    );
  };

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedStatus === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedStatus === 'all' && styles.filterButtonTextActive,
            ]}
          >
            Toutes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedStatus === 'pending' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedStatus === 'pending' && styles.filterButtonTextActive,
            ]}
          >
            En attente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedStatus === 'processing' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedStatus('processing')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedStatus === 'processing' && styles.filterButtonTextActive,
            ]}
          >
            Confirmée
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedStatus === 'shipped' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedStatus('shipped')}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedStatus === 'shipped' && styles.filterButtonTextActive,
            ]}
          >
            Prête
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Aucune commande trouvée</Text>
      <Text style={styles.emptySubtext}>
        Les nouvelles commandes apparaîtront ici
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStatusFilter()}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
        }
        ListEmptyComponent={renderEmptyState()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
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
    marginBottom: theme.spacing.sm,
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
  customerSection: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  customerInfo: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  locationButtonText: {
    color: 'white',
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  itemsSection: {
    marginBottom: theme.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: theme.colors.text,
  },
  itemQuantity: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  statusSection: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  actionsSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  totalSection: {
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  totalAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
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
  },
});

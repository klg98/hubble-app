import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, query, collection, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Store, StoreMetrics, StoreOrder } from '../../types';
import { useNavigation } from '@react-navigation/native';

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Date inconnue';
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}

const MetricCard = ({ title, value, icon, color, onPress }: MetricCardProps) => (
  <TouchableOpacity
    style={[styles.metricCard, { borderLeftColor: color }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.metricIcon}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

export const StoreDashboardScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStoreData().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Récupérer le storeId depuis le contexte de l'utilisateur
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.error('User not found');
        return;
      }
      const userData = userDoc.data();
      const storeId = userData.storeId;

      if (!storeId) {
        console.error('No store associated with user');
        return;
      }

      // Récupérer les données de la boutique
      const storeDoc = await getDoc(doc(db, 'stores', storeId));
      if (storeDoc.exists()) {
        setStore({ id: storeDoc.id, ...storeDoc.data() } as Store);
      }

      // Récupérer les produits pour calculer les métriques
      const productsQuery = query(
        collection(db, 'products'),
        where('storeId', '==', storeId)
      );
      const productsSnap = await getDocs(productsQuery);
      const products = productsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          image: data.images && data.images.length > 0 ? data.images[0] : null
        };
      });

      // Récupérer les commandes
      const ordersQuery = query(
        collection(db, 'storeOrders'),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoreOrder[];

      // Calculer les métriques
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const totalProducts = products.length;
      const totalOrders = orders.length;
      const totalSales = orders.reduce((sum, order) => sum + order.subtotal, 0);
      
      // Récupérer les commandes récentes
      const recentOrders = orders.slice(0, 5);

      // Récupérer les produits populaires
      const topProducts = products
        .sort((a: any, b: any) => (b.totalSales || 0) - (a.totalSales || 0))
        .slice(0, 5);

      setMetrics({
        pendingOrders,
        totalProducts,
        totalOrders,
        totalSales,
        recentOrders,
        topProducts
      });
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMetrics = () => (
    <View style={styles.metricsContainer}>
      <View style={styles.metricsRow}>
        <MetricCard
          title={'Commandes\nen attente'}
          value={metrics?.pendingOrders?.toString() || '0'}
          icon="hourglass"
          color={theme.colors.warning}
        />
        <MetricCard
          title="Produits"
          value={metrics?.totalProducts?.toString() || '0'}
          icon="pricetag"
          color={theme.colors.info}
          onPress={() => navigation.navigate('StoreProducts')}
        />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          title="Commandes"
          value={metrics?.totalOrders?.toString() || '0'}
          icon="cart"
          color={theme.colors.success}
          onPress={() => navigation.navigate('StoreOrders')}
        />
        <MetricCard
          title="Ventes"
          value={formatPrice(metrics?.totalSales || 0)}
          icon="cash"
          color={theme.colors.primary}
        />
      </View>
    </View>
  );

  const renderRecentOrders = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Commandes récentes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('StoreOrders')}>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {!metrics?.recentOrders?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aucune commande récente</Text>
        </View>
      ) : (
        metrics.recentOrders.map((order: any) => (
          <TouchableOpacity 
            key={order.id} 
            style={styles.orderItem}
            onPress={() => navigation.navigate('StoreOrders')}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>#{order.orderId.slice(-8)}</Text>
              <Text style={styles.orderAmount}>{formatPrice(order.subtotal)}</Text>
            </View>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderTopProducts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Produits populaires</Text>
        <TouchableOpacity onPress={() => navigation.navigate('StoreProducts')}>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {!metrics?.topProducts?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aucun produit</Text>
        </View>
      ) : (
        metrics.topProducts.map((product: any) => (
          <TouchableOpacity 
            key={product.id} 
            style={styles.productItem}
            onPress={() => navigation.navigate('StoreProducts')}
          >
            <Image
              source={{ uri: product.image || product.images?.[0] }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={styles.productStats}>
                <Text style={styles.productSales}>
                  {product.totalSales || 0} ventes
                </Text>
                <Text style={styles.productRevenue}>
                  {formatPrice(product.revenue || 0)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de bord</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('StoreSettings', { storeId: store?.id })}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddProduct', { storeId: store?.id })}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.actionText}>Ajouter un produit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('StoreOrders', { storeId: store?.id })}
          >
            <Ionicons name="receipt" size={24} color={theme.colors.primary} />
            <Text style={styles.actionText}>Voir les commandes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('StoreAnalytics', { storeId: store?.id })}
          >
            <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
            <Text style={styles.actionText}>Statistiques</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Overview */}
        {renderMetrics()}

        {/* Recent Orders */}
        {renderRecentOrders()}

        {/* Top Products */}
        {renderTopProducts()}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    color: theme.colors.text,
  },
  metricsContainer: {
    padding: theme.spacing.lg,
    backgroundColor: 'white',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  section: {
    marginTop: theme.spacing.lg,
    backgroundColor: 'white',
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  orderItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
  },
  orderDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  productItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productSales: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
});

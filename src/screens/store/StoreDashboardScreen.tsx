import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Store, StoreMetrics } from '../../types';

interface StoreDashboardScreenProps {
  navigation: any;
  route: {
    params: {
      storeId: string;
    };
  };
}

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

export const StoreDashboardScreen = ({ navigation, route }: StoreDashboardScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const storeDoc = await getDoc(doc(db, 'stores', route.params.storeId));
      if (storeDoc.exists()) {
        setStore(storeDoc.data() as Store);
      }

      // Fetch metrics (in a real app, this would be a separate collection)
      const metricsDoc = await getDoc(doc(db, 'stores', route.params.storeId, 'metrics', 'latest'));
      if (metricsDoc.exists()) {
        setMetrics(metricsDoc.data() as StoreMetrics);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderQuickActions = () => (
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
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de bord</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('StoreSettings', { storeId: store.id })}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Metrics Overview */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Ventes"
            value={`${store.metrics.totalSales}€`}
            icon="cash"
            color={theme.colors.success}
            onPress={() => navigation.navigate('StoreAnalytics', { storeId: store.id })}
          />
          <MetricCard
            title="Commandes"
            value={store.metrics.totalOrders}
            icon="cart"
            color={theme.colors.primary}
            onPress={() => navigation.navigate('StoreOrders', { storeId: store.id })}
          />
          <MetricCard
            title="Produits"
            value={store.metrics.totalProducts}
            icon="pricetag"
            color={theme.colors.warning}
            onPress={() => navigation.navigate('StoreProducts', { storeId: store.id })}
          />
          <MetricCard
            title="Note"
            value={store.metrics.averageRating.toFixed(1)}
            icon="star"
            color={theme.colors.secondary}
          />
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Commandes récentes</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('StoreOrders', { storeId: store.id })}
            >
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {metrics?.recentOrders.map((order) => (
            <View key={order.id} style={styles.orderItem}>
              <View>
                <Text style={styles.orderNumber}>Commande #{order.id}</Text>
                <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>{order.amount}€</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.colors[order.status === 'completed' ? 'success' : 'warning'] + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: theme.colors[order.status === 'completed' ? 'success' : 'warning'] },
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meilleurs produits</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('StoreProducts', { storeId: store.id })}
            >
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {metrics?.topProducts.map((product) => (
            <View key={product.id} style={styles.productItem}>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={styles.productStats}>
                <Text style={styles.productSales}>{product.sales} ventes</Text>
                <Text style={styles.productRevenue}>{product.revenue}€</Text>
              </View>
            </View>
          ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    marginHorizontal: '1%',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricIcon: {
    marginBottom: theme.spacing.sm,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  orderDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  productName: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productSales: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.success,
    marginTop: 2,
  },
});

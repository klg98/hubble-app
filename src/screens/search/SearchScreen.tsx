import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Product, Size } from '../../types';
import { ProductCard } from '../../components/common/ProductCard';
import { SearchFilters, FilterOptions } from '../../components/search/SearchFilters';

export const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Partial<FilterOptions>>({});

  // Filtres disponibles
  const filterOptions: FilterOptions = {
    categories: ['T-shirts', 'Pantalons', 'Robes', 'Vestes', 'Chaussures', 'Accessoires'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    priceRange: [0, 1000],
    conditions: ['new', 'like-new', 'good', 'fair'],
    sortBy: 'recent',
  };

  useEffect(() => {
    if (searchQuery.trim() || Object.keys(selectedFilters).length > 0) {
      searchProducts();
    }
  }, [searchQuery, selectedFilters]);

  const searchProducts = async () => {
    try {
      setLoading(true);

      // Construction de la requête Firestore
      let q = query(collection(db, 'products'), limit(50));

      // Ajout des filtres à la requête
      if (searchQuery.trim()) {
        // Note: Ceci est une implémentation basique. Pour une vraie recherche full-text,
        // il faudrait utiliser Algolia ou une solution similaire
        q = query(q, where('name', '>=', searchQuery.toLowerCase()));
      }

      if (selectedFilters.categories?.length) {
        q = query(q, where('category', 'in', selectedFilters.categories));
      }

      if (selectedFilters.sizes?.length) {
        q = query(q, where('sizes', 'array-contains-any', selectedFilters.sizes));
      }

      if (selectedFilters.conditions?.length) {
        q = query(q, where('condition', 'in', selectedFilters.conditions));
      }

      if (selectedFilters.priceRange) {
        q = query(
          q,
          where('price', '>=', selectedFilters.priceRange[0]),
          where('price', '<=', selectedFilters.priceRange[1])
        );
      }

      // Tri
      switch (selectedFilters.sortBy) {
        case 'price_asc':
          q = query(q, orderBy('price', 'asc'));
          break;
        case 'price_desc':
          q = query(q, orderBy('price', 'desc'));
          break;
        default:
          q = query(q, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      setProducts(productsData);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({});
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>
        Aucun résultat trouvé
      </Text>
      <Text style={styles.emptyStateText}>
        Essayez de modifier vos filtres ou votre recherche
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Search Header */}
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher des vêtements..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={searchProducts}
              autoCapitalize="none"
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <SearchFilters
            filters={filterOptions}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
          />
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={({ item }) => <ProductCard product={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productsList}
            numColumns={2}
            columnWrapperStyle={styles.productsRow}
            ListEmptyComponent={renderEmptyState()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: theme.colors.text,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsList: {
    padding: theme.spacing.md,
  },
  productsRow: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 100,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

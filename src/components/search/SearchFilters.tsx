import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { Size } from '../../types';

export interface FilterOptions {
  categories: string[];
  sizes: Size[];
  priceRange: [number, number];
  conditions: string[];
  sortBy: string;
}

interface SearchFiltersProps {
  filters: FilterOptions;
  selectedFilters: Partial<FilterOptions>;
  onFilterChange: (key: keyof FilterOptions, value: any) => void;
  onClearFilters: () => void;
}

export const SearchFilters = ({
  filters,
  selectedFilters,
  onFilterChange,
  onClearFilters,
}: SearchFiltersProps) => {
  const [showSortModal, setShowSortModal] = React.useState(false);

  const sortOptions = [
    { label: 'Plus récent', value: 'recent' },
    { label: 'Prix croissant', value: 'price_asc' },
    { label: 'Prix décroissant', value: 'price_desc' },
  ];

  const renderFilterChip = (
    label: string,
    isSelected: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[styles.filterChip, isSelected && styles.selectedFilterChip]}
      onPress={onPress}
    >
      <Text
        style={[styles.filterChipText, isSelected && styles.selectedFilterChipText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getConditionLabel = (condition: string) => {
    const labels: { [key: string]: string } = {
      'new': 'Neuf',
      'like-new': 'Comme neuf',
      'good': 'Bon état',
      'fair': 'État correct',
    };
    return labels[condition] || condition;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  return (
    <View style={styles.container}>
      {/* Clear Filters Button */}
      {Object.keys(selectedFilters).length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClearFilters}
        >
          <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
          <Text style={styles.clearButtonText}>Effacer les filtres</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {/* Sort Button */}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="funnel-outline" size={16} color={theme.colors.text} />
          <Text style={styles.sortButtonText}>
            {selectedFilters.sortBy
              ? sortOptions.find(opt => opt.value === selectedFilters.sortBy)?.label
              : 'Trier'}
          </Text>
        </TouchableOpacity>

        {/* Categories */}
        {filters.categories.map((category) => (
          renderFilterChip(
            category,
            selectedFilters.categories?.includes(category) || false,
            () => {
              const current = selectedFilters.categories || [];
              const updated = current.includes(category)
                ? current.filter(c => c !== category)
                : [...current, category];
              onFilterChange('categories', updated);
            }
          )
        ))}

        {/* Sizes */}
        {filters.sizes.map((size) => (
          renderFilterChip(
            size,
            selectedFilters.sizes?.includes(size) || false,
            () => {
              const current = selectedFilters.sizes || [];
              const updated = current.includes(size)
                ? current.filter(s => s !== size)
                : [...current, size];
              onFilterChange('sizes', updated);
            }
          )
        ))}

        {/* Conditions */}
        {filters.conditions.map((condition) => (
          renderFilterChip(
            getConditionLabel(condition),
            selectedFilters.conditions?.includes(condition) || false,
            () => {
              const current = selectedFilters.conditions || [];
              const updated = current.includes(condition)
                ? current.filter(c => c !== condition)
                : [...current, condition];
              onFilterChange('conditions', updated);
            }
          )
        ))}

        {/* Price Range */}
        {renderFilterChip(
          `${formatPrice(filters.priceRange[0])} - ${formatPrice(filters.priceRange[1])}`,
          !!selectedFilters.priceRange,
          () => onFilterChange('priceRange', filters.priceRange)
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trier par</Text>
              <TouchableOpacity
                onPress={() => setShowSortModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  onFilterChange('sortBy', option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  selectedFilters.sortBy === option.value && styles.selectedSortOptionText
                ]}>
                  {option.label}
                </Text>
                {selectedFilters.sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  clearButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  sortButtonText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  filterChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedFilterChip: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  selectedFilterChipText: {
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  sortOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  selectedSortOptionText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

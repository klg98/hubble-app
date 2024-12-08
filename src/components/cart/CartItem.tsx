import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { CartItem as CartItemType, Product } from '../../types';

interface CartItemProps {
  item: CartItemType;
  product: Product;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.25;

export const CartItemComponent = ({
  item,
  product,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) => {
  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  return (
    <View style={styles.container}>
      {/* Image du produit */}
      <Image
        source={{ uri: product.images[0] }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Informations du produit */}
      <View style={styles.details}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.brand}>{product.brand}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Variantes sélectionnées */}
        <View style={styles.variants}>
          <Text style={styles.variantText}>
            Taille : {item.selectedSize}
          </Text>
          <View style={styles.colorContainer}>
            <Text style={styles.variantText}>Couleur : </Text>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: item.selectedColor.code },
              ]}
            />
          </View>
        </View>

        {/* Prix et quantité */}
        <View style={styles.footer}>
          <Text style={styles.price}>
            {formatPrice(item.price)}
          </Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                item.quantity === 1 && styles.quantityButtonDisabled,
              ]}
              onPress={() => item.quantity > 1 && onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity === 1}
            >
              <Ionicons
                name="remove"
                size={20}
                color={
                  item.quantity === 1
                    ? theme.colors.textSecondary
                    : theme.colors.text
                }
              />
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Ionicons name="add" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  details: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  brand: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  variants: {
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  variantText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: theme.spacing.sm,
    minWidth: 24,
    textAlign: 'center',
  },
});

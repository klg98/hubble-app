import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { CartItem as CartItemType } from '../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.25;

export const CartItemComponent = ({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) => {
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const productDoc = await getDoc(doc(db, 'products', item.productId));
      if (productDoc.exists()) {
        const product = productDoc.data();
        setStock(product.stock);
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (typeof price === 'undefined') return '0 €';
    return price.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const isMaxQuantity = stock !== null && item.quantity >= stock;

  return (
    <View style={styles.container}>
      {/* Image du produit */}
      <Image
        source={{ uri: item.image }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Informations du produit */}
      <View style={styles.details}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Taille sélectionnée */}
        <View style={styles.variants}>
          <Text style={styles.variantText}>
            Taille : {item.size}
          </Text>
          {stock !== null && (
            <Text style={[styles.variantText, stock < 5 && styles.lowStock]}>
              Stock disponible : {stock}
            </Text>
          )}
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
              style={[
                styles.quantityButton,
                isMaxQuantity && styles.quantityButtonDisabled,
              ]}
              onPress={() => !isMaxQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={isMaxQuantity}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons
                  name="add"
                  size={20}
                  color={isMaxQuantity ? theme.colors.textSecondary : theme.colors.text}
                />
              )}
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
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: theme.borderRadius.md,
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
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  variants: {
    marginTop: theme.spacing.sm,
  },
  variantText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  lowStock: {
    color: theme.colors.error,
    fontWeight: '500',
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
    padding: theme.spacing.sm,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: theme.spacing.sm,
  },
});

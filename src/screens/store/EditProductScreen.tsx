import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Button } from '../../components/common/Button';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const EditProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const product = route.params?.product;

  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [description, setDescription] = useState(product?.description || '');
  const [sizes, setSizes] = useState(product?.sizes || []);
  const [stock, setStock] = useState(product?.stock?.toString() || '');
  const [loading, setLoading] = useState(false);

  const handleUpdateProduct = async () => {
    try {
      setLoading(true);
      if (!product?.id) {
        Alert.alert('Erreur', 'ID du produit manquant');
        return;
      }

      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        name,
        price: Number(price),
        description,
        sizes,
        stock: Number(stock),
        updatedAt: new Date(),
      });

      Alert.alert('Succès', 'Produit mis à jour avec succès');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le produit');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSize = () => {
    setSizes([...sizes, '']);
  };

  const handleUpdateSize = (index: number, value: string) => {
    const newSizes = [...sizes];
    newSizes[index] = value;
    setSizes(newSizes);
  };

  const handleRemoveSize = (index: number) => {
    const newSizes = sizes.filter((_, i) => i !== index);
    setSizes(newSizes);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Nom du produit</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nom du produit"
        />

        <Text style={styles.label}>Prix</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="Prix"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Stock disponible</Text>
        <TextInput
          style={styles.input}
          value={stock}
          onChangeText={setStock}
          placeholder="Stock disponible"
          keyboardType="numeric"
        />

        <View style={styles.sizesContainer}>
          <Text style={styles.label}>Tailles disponibles</Text>
          {sizes.map((size, index) => (
            <View key={index} style={styles.sizeRow}>
              <TextInput
                style={[styles.input, styles.sizeInput]}
                value={size}
                onChangeText={(value) => handleUpdateSize(index, value)}
                placeholder="Taille"
              />
              <TouchableOpacity
                onPress={() => handleRemoveSize(index)}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <Button
            onPress={handleAddSize}
            style={styles.addSizeButton}
          >
            <Text style={styles.addSizeButtonText}>Ajouter une taille</Text>
          </Button>
        </View>

        <Button
          onPress={handleUpdateProduct}
          style={styles.submitButton}
          loading={loading}
        >
          <Text style={styles.submitButtonText}>Mettre à jour le produit</Text>
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  form: {
    padding: theme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sizesContainer: {
    marginBottom: theme.spacing.lg,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sizeInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: theme.spacing.sm,
  },
  removeButton: {
    padding: theme.spacing.sm,
  },
  addSizeButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  addSizeButtonText: {
    color: theme.colors.primary,
  },
  submitButton: {
    marginTop: theme.spacing.lg,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

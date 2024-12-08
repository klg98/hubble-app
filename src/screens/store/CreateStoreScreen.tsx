import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Store } from '../../types';

interface CreateStoreScreenProps {
  navigation: any;
}

export const CreateStoreScreen = ({ navigation }: CreateStoreScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [storeData, setStoreData] = useState({
    name: '',
    description: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    categories: [] as string[],
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const handleImagePick = async (type: 'logo' | 'banner') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (type === 'logo') {
          setLogo(result.assets[0].uri);
        } else {
          setBanner(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadImage = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, blob);
    return getDownloadURL(imageRef);
  };

  const handleCreateStore = async () => {
    try {
      if (!storeData.name.trim()) {
        Alert.alert('Erreur', 'Le nom de la boutique est obligatoire');
        return;
      }

      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      let logoUrl = '';
      let bannerUrl = '';

      if (logo) {
        logoUrl = await uploadImage(logo, `stores/${userId}/logo`);
      }
      if (banner) {
        bannerUrl = await uploadImage(banner, `stores/${userId}/banner`);
      }

      const storeId = doc(db, 'stores').id;
      const store: Store = {
        id: storeId,
        ownerId: userId,
        name: storeData.name.trim(),
        description: storeData.description.trim(),
        logo: logoUrl,
        bannerImage: bannerUrl,
        location: storeData.location.trim(),
        contactEmail: storeData.contactEmail.trim(),
        contactPhone: storeData.contactPhone.trim(),
        categories: storeData.categories,
        rating: 0,
        reviewCount: 0,
        followers: 0,
        isVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'pending',
        metrics: {
          totalSales: 0,
          totalProducts: 0,
          totalOrders: 0,
          averageRating: 0,
        },
      };

      await setDoc(doc(db, 'stores', storeId), store);
      await setDoc(doc(db, 'users', userId), {
        storeId,
        isVendor: true,
      }, { merge: true });

      navigation.replace('StoreDashboard', { storeId });
    } catch (error) {
      console.error('Error creating store:', error);
      Alert.alert('Erreur', 'Impossible de créer la boutique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Créer une boutique</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Logo */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Logo de la boutique</Text>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => handleImagePick('logo')}
          >
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.uploadText}>Ajouter un logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Bannière</Text>
          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={() => handleImagePick('banner')}
          >
            {banner ? (
              <Image source={{ uri: banner }} style={styles.banner} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.uploadText}>Ajouter une bannière</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Store Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Nom de la boutique *</Text>
          <TextInput
            style={styles.input}
            value={storeData.name}
            onChangeText={(text) => setStoreData((prev) => ({ ...prev, name: text }))}
            placeholder="Nom de votre boutique"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={storeData.description}
            onChangeText={(text) => setStoreData((prev) => ({ ...prev, description: text }))}
            placeholder="Décrivez votre boutique"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Localisation</Text>
          <TextInput
            style={styles.input}
            value={storeData.location}
            onChangeText={(text) => setStoreData((prev) => ({ ...prev, location: text }))}
            placeholder="Ville, Pays"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email de contact</Text>
          <TextInput
            style={styles.input}
            value={storeData.contactEmail}
            onChangeText={(text) => setStoreData((prev) => ({ ...prev, contactEmail: text }))}
            placeholder="email@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={storeData.contactPhone}
            onChangeText={(text) => setStoreData((prev) => ({ ...prev, contactPhone: text }))}
            placeholder="+33 6 12 34 56 78"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.disabledButton]}
          onPress={handleCreateStore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.createButtonText}>Créer la boutique</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  imageSection: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  bannerContainer: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  uploadText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  disabledButton: {
    opacity: 0.7,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

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
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Store } from '../../types';

interface CreateStoreScreenProps {
  navigation: any;
}

export const CreateStoreScreen = ({ navigation }: CreateStoreScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    description: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    categories: [] as string[],
    logo: '',
    bannerImage: '',
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
    try {
      console.log('Starting image upload:', { uri, path });
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob created:', { size: blob.size, type: blob.type });
      
      // Ajouter une extension de fichier et un timestamp
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      const fullPath = `${path}/${filename}`;
      console.log('Generated file path:', fullPath);
      
      const imageRef = ref(storage, fullPath);
      console.log('Starting upload to Firebase Storage');
      const uploadResult = await uploadBytes(imageRef, blob);
      console.log('Upload successful:', uploadResult);
      
      const downloadURL = await getDownloadURL(imageRef);
      console.log('Got download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Detailed upload error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  };

  const validateUsername = async (username: string) => {
    if (!username) return false;
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      Alert.alert('Erreur', 'L\'identifiant doit contenir entre 3 et 20 caractères alphanumériques ou underscore.');
      return false;
    }
    
    try {
      const usernameQuery = query(
        collection(db, 'stores'),
        where('username', '==', username.toLowerCase())
      );
      const querySnapshot = await getDocs(usernameQuery);
      
      if (!querySnapshot.empty) {
        Alert.alert('Erreur', 'Cet identifiant est déjà pris.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking username availability:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification de l\'identifiant.');
      return false;
    }
  };

  const handleCreateStore = async () => {
    if (!formData.name || !formData.username || !formData.description) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!await validateUsername(formData.username)) {
      return;
    }

    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      console.log('Starting store creation for user:', userId);
      let logoUrl = '';
      let bannerUrl = '';

      if (logo || banner) {
        try {
          if (logo) {
            console.log('Uploading logo...');
            logoUrl = await uploadImage(logo, `stores/${userId}/logos`);
            console.log('Logo uploaded successfully:', logoUrl);
          }
          if (banner) {
            console.log('Uploading banner...');
            bannerUrl = await uploadImage(banner, `stores/${userId}/banners`);
            console.log('Banner uploaded successfully:', bannerUrl);
          }
        } catch (uploadError) {
          console.error('Detailed image upload error:', uploadError);
          if (uploadError instanceof Error) {
            Alert.alert('Erreur', `Impossible de télécharger les images: ${uploadError.message}`);
          } else {
            Alert.alert('Erreur', 'Impossible de télécharger les images');
          }
          return;
        }
      }

      // Créer une référence de document avec un ID auto-généré
      const storeRef = doc(collection(db, 'stores'));
      const storeId = storeRef.id;
      console.log('Generated store ID:', storeId);

      const store: Store = {
        id: storeId,
        ownerId: userId,
        name: formData.name.trim(),
        username: formData.username.trim(),
        description: formData.description.trim(),
        logo: logoUrl,
        bannerImage: bannerUrl,
        location: formData.location.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        categories: formData.categories,
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

      console.log('Creating store document in Firestore...');
      // Utiliser la référence créée précédemment
      await setDoc(storeRef, store);
      console.log('Store document created successfully');
      
      console.log('Updating user profile...');
      await setDoc(doc(db, 'users', userId), {
        storeId,
        isVendor: true,
      }, { merge: true });
      console.log('User profile updated successfully');

      // Reset la navigation vers le profil puis naviguer vers le tableau de bord
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Profile' },
          { name: 'StoreDashboard', params: { storeId } }
        ],
      });
    } catch (error) {
      console.error('Store creation error:', error);
      if (error instanceof Error) {
        Alert.alert('Erreur', `Impossible de créer la boutique: ${error.message}`);
      } else {
        Alert.alert('Erreur', 'Impossible de créer la boutique');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logo de la boutique</Text>
          <TouchableOpacity 
            style={styles.imagePickerButton} 
            onPress={() => handleImagePick('logo')}
          >
            {logo ? (
              <Image source={{ uri: logo }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.placeholderText}>Ajouter un logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Banner Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bannière</Text>
          <TouchableOpacity 
            style={[styles.imagePickerButton, styles.bannerButton]} 
            onPress={() => handleImagePick('banner')}
          >
            {banner ? (
              <Image source={{ uri: banner }} style={styles.bannerPreview} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.placeholderText}>Ajouter une bannière</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Store Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nom de la boutique *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom de la boutique"
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identifiant unique (@username) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Identifiant unique (@username)"
            value={formData.username}
            onChangeText={(text) => handleInputChange('username', text.toLowerCase())}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre boutique"
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation</Text>
          <TextInput
            style={styles.input}
            placeholder="Ville, Pays"
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email de contact</Text>
          <TextInput
            style={styles.input}
            placeholder="email@exemple.com"
            value={formData.contactEmail}
            onChangeText={(text) => handleInputChange('contactEmail', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="+33 6 12 34 56 78"
            value={formData.contactPhone}
            onChangeText={(text) => handleInputChange('contactPhone', text)}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              !formData.name.trim() && styles.buttonDisabled
            ]}
            onPress={handleCreateStore}
            disabled={!formData.name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Créer la boutique</Text>
            )}
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  imagePickerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  bannerButton: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.lg,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  placeholderText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
});

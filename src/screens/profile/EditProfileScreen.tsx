import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { UserProfile } from '../../types';

export const EditProfileScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setProfileData(userDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à la galerie.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à votre localisation.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const formattedAddress = `${address.street || ''} ${address.city || ''} ${
        address.postalCode || ''
      } ${address.country || ''}`.trim();

      setProfileData((prev) => ({
        ...prev!,
        addresses: {
          ...prev!.addresses,
          geolocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address: formattedAddress,
          },
        },
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible de récupérer votre position');
    }
  };

  const openInMaps = () => {
    if (!profileData?.addresses.geolocation) return;

    const { latitude, longitude } = profileData.addresses.geolocation;
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `${scheme}${latitude},${longitude}`,
      android: `${scheme}${latitude},${longitude}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const handleSave = async () => {
    try {
      if (!profileData?.fullName.trim()) {
        Alert.alert('Erreur', 'Le nom complet est obligatoire');
        return;
      }

      setSaving(true);
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      let photoURL = profileData.photoURL;
      if (newImage) {
        const response = await fetch(newImage);
        const blob = await response.blob();
        const imageName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const imageRef = ref(storage, `profiles/${userId}/${imageName}`);
        await uploadBytes(imageRef, blob);
        photoURL = await getDownloadURL(imageRef);
      }

      const updatedProfile = {
        ...profileData,
        photoURL,
        updatedAt: Date.now(),
      };

      await updateDoc(doc(db, 'users', userId), updatedProfile);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.saveButton}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Photo de profil */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handleImagePick}>
            {newImage || profileData.photoURL ? (
              <Image
                source={{ uri: newImage || profileData.photoURL }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={theme.colors.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Modifier la photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Informations de base */}
        <View style={styles.section}>
          <Text style={styles.label}>Nom complet *</Text>
          <TextInput
            style={styles.input}
            value={profileData.fullName}
            onChangeText={(text) =>
              setProfileData((prev) => ({ ...prev!, fullName: text }))
            }
            placeholder="Votre nom complet"
          />

          <Text style={styles.label}>Numéro de téléphone</Text>
          <TextInput
            style={styles.input}
            value={profileData.phone}
            onChangeText={(text) =>
              setProfileData((prev) => ({ ...prev!, phone: text }))
            }
            placeholder="Votre numéro de téléphone"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profileData.bio}
            onChangeText={(text) =>
              setProfileData((prev) => ({ ...prev!, bio: text }))
            }
            placeholder="Parlez-nous un peu de vous"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Adresse manuelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          <TextInput
            style={styles.input}
            value={profileData.addresses.manual?.street}
            onChangeText={(text) =>
              setProfileData((prev) => ({
                ...prev!,
                addresses: {
                  ...prev!.addresses,
                  manual: {
                    ...prev!.addresses.manual!,
                    street: text,
                  },
                },
              }))
            }
            placeholder="Rue"
          />
          <TextInput
            style={styles.input}
            value={profileData.addresses.manual?.city}
            onChangeText={(text) =>
              setProfileData((prev) => ({
                ...prev!,
                addresses: {
                  ...prev!.addresses,
                  manual: {
                    ...prev!.addresses.manual!,
                    city: text,
                  },
                },
              }))
            }
            placeholder="Ville"
          />
          <TextInput
            style={styles.input}
            value={profileData.addresses.manual?.postalCode}
            onChangeText={(text) =>
              setProfileData((prev) => ({
                ...prev!,
                addresses: {
                  ...prev!.addresses,
                  manual: {
                    ...prev!.addresses.manual!,
                    postalCode: text,
                  },
                },
              }))
            }
            placeholder="Code postal"
          />
          <TextInput
            style={styles.input}
            value={profileData.addresses.manual?.country}
            onChangeText={(text) =>
              setProfileData((prev) => ({
                ...prev!,
                addresses: {
                  ...prev!.addresses,
                  manual: {
                    ...prev!.addresses.manual!,
                    country: text,
                  },
                },
              }))
            }
            placeholder="Pays"
          />
        </View>

        {/* Géolocalisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation actuelle</Text>
          {profileData.addresses.geolocation ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationText}>
                {profileData.addresses.geolocation.address}
              </Text>
              <TouchableOpacity onPress={openInMaps} style={styles.mapButton}>
                <Text style={styles.mapButtonText}>Ouvrir dans Maps</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleGetLocation} style={styles.locationButton}>
              <Ionicons name="location" size={24} color={theme.colors.primary} />
              <Text style={styles.locationButtonText}>
                Utiliser ma position actuelle
              </Text>
            </TouchableOpacity>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveButton: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  locationButtonText: {
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.primary,
  },
  locationContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  mapButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

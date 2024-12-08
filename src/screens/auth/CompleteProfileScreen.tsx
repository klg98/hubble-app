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
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../services/firebase';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { theme } from '../../theme/theme';
import { UserProfile } from '../../types';

interface CompleteProfileScreenProps {
  navigation: any;
}

export const CompleteProfileScreen = ({ navigation }: CompleteProfileScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

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
        setProfileImage(result.assets[0].uri);
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

      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible de récupérer votre position');
    }
  };

  const openInMaps = () => {
    if (!location) return;

    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `${scheme}${location.latitude},${location.longitude}`,
      android: `${scheme}${location.latitude},${location.longitude}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!fullName.trim()) {
        Alert.alert('Erreur', 'Le nom complet est obligatoire');
        return;
      }

      setLoading(true);
      const user = auth.currentUser;
      if (!user?.uid || !user?.email) {
        throw new Error('User not authenticated');
      }

      let photoURL = '';
      if (profileImage) {
        const response = await fetch(profileImage);
        const blob = await response.blob();
        const imageName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const imageRef = ref(storage, `profiles/${user.uid}/${imageName}`);
        await uploadBytes(imageRef, blob);
        photoURL = await getDownloadURL(imageRef);
      }

      // Création de l'objet de base
      const userProfile: Partial<UserProfile> = {
        id: user.uid,
        email: user.email,
        fullName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        addresses: {},
      };

      // Ajout des champs optionnels seulement s'ils ont une valeur
      if (photoURL) {
        userProfile.photoURL = photoURL;
      }
      
      if (bio?.trim()) {
        userProfile.bio = bio.trim();
      }
      
      if (phone?.trim()) {
        userProfile.phone = phone.trim();
      }

      // Ajout de l'adresse manuelle si tous les champs requis sont remplis
      if (street?.trim() && city?.trim() && postalCode?.trim() && country?.trim()) {
        userProfile.addresses.manual = {
          street: street.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        };
      }

      // Ajout de la géolocalisation si disponible
      if (location) {
        userProfile.addresses.geolocation = location;
      }

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, userProfile);
      
      // Attendre un peu pour que Firestore se mette à jour
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Rafraîchir l'état de l'application en rechargeant l'utilisateur
      await user.reload();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Complétez votre profil</Text>
        <Text style={styles.subtitle}>
          Ajoutez quelques informations pour personnaliser votre expérience
        </Text>

        {/* Photo de profil */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handleImagePick}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={theme.colors.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Ajouter une photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Nom complet */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom complet *</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Votre nom complet"
          />
        </View>

        {/* Téléphone */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Numéro de téléphone (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Votre numéro de téléphone"
            keyboardType="phone-pad"
          />
        </View>

        {/* Bio */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Bio (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Parlez-nous un peu de vous"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Adresse manuelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison (optionnel)</Text>
          
          <TextInput
            style={styles.input}
            value={street}
            onChangeText={setStreet}
            placeholder="Rue"
          />
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ville"
          />
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="Code postal"
          />
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="Pays"
          />
        </View>

        {/* Géolocalisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation actuelle</Text>
          {location ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationText}>{location.address}</Text>
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

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Terminer</Text>
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
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
  inputContainer: {
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

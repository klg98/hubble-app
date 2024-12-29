import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';

export const AddressesScreen = () => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  // Charger les données actuelles de l'utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Charger l'adresse manuelle
          if (userData.addresses?.manual) {
            setStreet(userData.addresses.manual.street || '');
            setCity(userData.addresses.manual.city || '');
            setPostalCode(userData.addresses.manual.postalCode || '');
            setCountry(userData.addresses.manual.country || '');
          }

          // Charger la géolocalisation
          if (userData.addresses?.geolocation) {
            setLocation(userData.addresses.geolocation);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Erreur', 'Impossible de charger vos adresses');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

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

  const handleSave = async () => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      if (!user) return;

      const updates: any = { updatedAt: Date.now() };

      // Mettre à jour l'adresse manuelle si tous les champs sont remplis
      if (street?.trim() && city?.trim() && postalCode?.trim() && country?.trim()) {
        updates['addresses.manual'] = {
          street: street.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        };
      }

      // Mettre à jour la géolocalisation si disponible
      if (location) {
        updates['addresses.geolocation'] = location;
      }

      await updateDoc(doc(db, 'users', user.uid), updates);
      Alert.alert('Succès', 'Vos adresses ont été mises à jour');
    } catch (error) {
      console.error('Error updating addresses:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour vos adresses');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse manuelle</Text>
          <TextInput
            style={styles.input}
            placeholder="Rue"
            value={street}
            onChangeText={setStreet}
          />
          <TextInput
            style={styles.input}
            placeholder="Ville"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={styles.input}
            placeholder="Code postal"
            value={postalCode}
            onChangeText={setPostalCode}
          />
          <TextInput
            style={styles.input}
            placeholder="Pays"
            value={country}
            onChangeText={setCountry}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Géolocalisation</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleGetLocation}
          >
            <Ionicons name="location" size={24} color={theme.colors.primary} />
            <Text style={styles.locationButtonText}>
              Utiliser ma position actuelle
            </Text>
          </TouchableOpacity>

          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>{location.address}</Text>
              <TouchableOpacity
                style={styles.viewOnMapButton}
                onPress={openInMaps}
              >
                <Text style={styles.viewOnMapText}>Voir sur la carte</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, updating && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
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
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    fontSize: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  locationButtonText: {
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.primary,
  },
  locationInfo: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  viewOnMapButton: {
    alignSelf: 'flex-start',
  },
  viewOnMapText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

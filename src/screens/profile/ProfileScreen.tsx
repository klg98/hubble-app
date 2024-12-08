import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { theme } from '../../theme/theme';
import { signOut } from 'firebase/auth';

interface ProfileScreenProps {
  navigation: any;
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  showArrow?: boolean;
}

export const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    bio: '',
    photoURL: '',
  });
  const [hasStore, setHasStore] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    checkStore();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileData({
          displayName: data.displayName || '',
          email: auth.currentUser?.email || '',
          phoneNumber: data.phoneNumber || '',
          bio: data.bio || '',
          photoURL: data.photoURL || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Erreur', 'Impossible de charger votre profil');
    } finally {
      setLoading(false);
    }
  };

  const checkStore = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.storeId) {
          setHasStore(true);
          setStoreId(userData.storeId);
        }
      }
    } catch (error) {
      console.error('Error checking store:', error);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setLoading(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const userId = auth.currentUser?.uid;
        const imageRef = ref(storage, `profile-images/${userId}`);
        
        await uploadBytes(imageRef, blob);
        const photoURL = await getDownloadURL(imageRef);
        
        await updateProfile({ photoURL });
        setProfileData(prev => ({ ...prev, photoURL }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour votre photo de profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Erreur', 'Impossible de vous déconnecter');
    }
  };

  const updateProfile = async (data: Partial<typeof profileData>) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const renderMenuItem = ({ icon, title, onPress, showArrow = true }: MenuItem) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={24} color={theme.colors.text} />
        <Text style={styles.menuItemTitle}>{title}</Text>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
            {profileData.photoURL ? (
              <Image source={{ uri: profileData.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{profileData.displayName || 'Sans nom'}</Text>
          <Text style={styles.email}>{profileData.email}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          {renderMenuItem({
            icon: 'location',
            title: 'Mes adresses',
            onPress: () => navigation.navigate('Addresses'),
          })}
          {renderMenuItem({
            icon: 'card',
            title: 'Moyens de paiement',
            onPress: () => navigation.navigate('PaymentMethods'),
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes commandes</Text>
          {renderMenuItem({
            icon: 'time',
            title: 'Commandes en cours',
            onPress: () => navigation.navigate('ActiveOrders'),
          })}
          {renderMenuItem({
            icon: 'receipt',
            title: 'Historique des commandes',
            onPress: () => navigation.navigate('OrderHistory'),
          })}
        </View>

        {/* Section Boutique */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma boutique</Text>
          {hasStore ? (
            <>
              {renderMenuItem({
                icon: 'storefront',
                title: 'Gérer ma boutique',
                onPress: () => navigation.navigate('StoreDashboard', { storeId }),
              })}
              {renderMenuItem({
                icon: 'add-circle',
                title: 'Ajouter un produit',
                onPress: () => navigation.navigate('AddProduct', { storeId }),
              })}
            </>
          ) : (
            renderMenuItem({
              icon: 'add-circle',
              title: 'Créer ma boutique',
              onPress: () => navigation.navigate('CreateStore'),
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          {renderMenuItem({
            icon: 'notifications',
            title: 'Notifications',
            onPress: () => navigation.navigate('NotificationSettings'),
          })}
          {renderMenuItem({
            icon: 'lock-closed',
            title: 'Confidentialité',
            onPress: () => navigation.navigate('Privacy'),
          })}
          {renderMenuItem({
            icon: 'help-circle',
            title: 'Aide',
            onPress: () => navigation.navigate('Help'),
          })}
          {renderMenuItem({
            icon: 'log-out',
            title: 'Déconnexion',
            onPress: handleLogout,
            showArrow: false,
          })}
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
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  profileSection: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  editButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.lg,
  },
});

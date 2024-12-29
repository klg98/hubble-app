import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';

interface PrivacySettings {
  shareLocation: boolean;
  shareProfile: boolean;
  receiveMessages: boolean;
  showOrderHistory: boolean;
  allowDataCollection: boolean;
}

export const PrivacyScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    shareLocation: true,
    shareProfile: true,
    receiveMessages: true,
    showOrderHistory: true,
    allowDataCollection: true,
  });

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.privacySettings) {
          setSettings(userData.privacySettings);
        }
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      Alert.alert('Erreur', 'Impossible de charger vos paramètres de confidentialité');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (setting: keyof PrivacySettings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await updateDoc(doc(db, 'users', userId), {
        privacySettings: settings,
        updatedAt: Date.now(),
      });

      Alert.alert('Succès', 'Vos paramètres de confidentialité ont été mis à jour');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder vos paramètres de confidentialité');
    } finally {
      setSaving(false);
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
          <Text style={styles.sectionTitle}>Localisation</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Partager ma position</Text>
              <Text style={styles.settingDescription}>
                Permet aux vendeurs de voir votre position pour la livraison
              </Text>
            </View>
            <Switch
              value={settings.shareLocation}
              onValueChange={() => handleToggle('shareLocation')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Profil public</Text>
              <Text style={styles.settingDescription}>
                Rendre votre profil visible pour les autres utilisateurs
              </Text>
            </View>
            <Switch
              value={settings.shareProfile}
              onValueChange={() => handleToggle('shareProfile')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Messages</Text>
              <Text style={styles.settingDescription}>
                Autoriser les vendeurs à vous envoyer des messages
              </Text>
            </View>
            <Switch
              value={settings.receiveMessages}
              onValueChange={() => handleToggle('receiveMessages')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Historique des commandes</Text>
              <Text style={styles.settingDescription}>
                Autoriser les vendeurs à voir votre historique de commandes
              </Text>
            </View>
            <Switch
              value={settings.showOrderHistory}
              onValueChange={() => handleToggle('showOrderHistory')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Données</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Collecte de données</Text>
              <Text style={styles.settingDescription}>
                Autoriser la collecte de données pour améliorer nos services
              </Text>
            </View>
            <Switch
              value={settings.allowDataCollection}
              onValueChange={() => handleToggle('allowDataCollection')}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveIcon: {
    marginRight: theme.spacing.sm,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

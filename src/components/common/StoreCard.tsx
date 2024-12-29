import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { Store } from '../../types';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StoreCardProps {
  store: Store;
  onPress?: () => void;
  onOwnerPress?: () => void;
}

export const StoreCard = ({ store, onPress, onOwnerPress }: StoreCardProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ownerBio, setOwnerBio] = useState('');
  const [showBioModal, setShowBioModal] = useState(false);

  useEffect(() => {
    checkFollowStatus();
    fetchOwnerBio();
  }, []);

  const checkFollowStatus = async () => {
    if (!auth.currentUser) return;
    try {
      const followDoc = await getDoc(
        doc(db, 'followers', `${auth.currentUser.uid}_${store.id}`)
      );
      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchOwnerBio = async () => {
    try {
      const ownerDoc = await getDoc(doc(db, 'users', store.ownerId));
      if (ownerDoc.exists()) {
        setOwnerBio(ownerDoc.data().bio || '');
      }
    } catch (error) {
      console.error('Error fetching owner bio:', error);
    }
  };

  const handleFollow = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const followerId = auth.currentUser.uid;
      const followDoc = doc(db, 'followers', `${followerId}_${store.id}`);

      if (isFollowing) {
        await deleteDoc(followDoc);
        // Décrémenter le nombre de followers
        await setDoc(doc(db, 'stores', store.id), {
          followers: store.followers - 1
        }, { merge: true });
      } else {
        await setDoc(followDoc, {
          userId: followerId,
          storeId: store.id,
          createdAt: Date.now()
        });
        // Incrémenter le nombre de followers
        await setDoc(doc(db, 'stores', store.id), {
          followers: store.followers + 1
        }, { merge: true });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCreationDate = (timestamp: number) => {
    return `créé en ${format(timestamp, 'MMMM yyyy', { locale: fr })}`;
  };

  const getDisplayImage = () => {
    if (store.recentProducts && store.recentProducts.length > 0) {
      return store.recentProducts[0];
    }
    if (store.bannerImage) {
      return store.bannerImage;
    }
    return store.logo;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing && styles.followingButton
          ]}
          onPress={handleFollow}
          disabled={loading}
        >
          <Text style={[
            styles.followButtonText,
            isFollowing && styles.followingButtonText
          ]}>
            {isFollowing ? 'Fidélisé' : 'Se fidéliser'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPress} style={styles.profileSection}>
          <View style={styles.logoContainer}>
            <Image source={{ uri: store.logo }} style={styles.logo} />
          </View>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{store.name}</Text>
            <Text style={styles.username}>@{store.username}</Text>
            <Text style={styles.creationDate}>
              {formatCreationDate(store.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ownerButton}
          onPress={() => setShowBioModal(true)}
        >
          <Text style={styles.ownerButtonText}>Propriétaire</Text>
        </TouchableOpacity>
      </View>

      <Text 
        style={styles.description}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {store.description}
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{store.totalProducts}</Text>
          <Text style={styles.statLabel}>Articles</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{store.followers}</Text>
          <Text style={styles.statLabel}>Fidèles</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{store.following}</Text>
          <Text style={styles.statLabel}>Fidélisations</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onPress}>
        <Image
          source={{ uri: getDisplayImage() }}
          style={styles.recentImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <Modal
        visible={showBioModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBioModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBioModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Biographie du propriétaire</Text>
            <Text style={styles.modalText}>{ownerBio || 'Aucune biographie disponible.'}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowBioModal(false)}
            >
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  nameSection: {
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  creationDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
  },
  followingButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  followingButtonText: {
    color: theme.colors.primary,
  },
  ownerButton: {
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
  },
  ownerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 15,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recentImage: {
    width: '100%',
    height: 200,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: theme.colors.text,
  },
  modalText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

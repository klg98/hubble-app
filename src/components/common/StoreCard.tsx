import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Store } from '../../types';
import { theme } from '../../theme/theme';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

interface StoreCardProps {
  store: Store;
  onOwnerPress: () => void;
}

export const StoreCard = ({ store, onOwnerPress }: StoreCardProps) => {
  const navigation = useNavigation();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    checkIfFollowing();
  }, []);

  const checkIfFollowing = async () => {
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

  const handleFollow = async () => {
    if (!auth.currentUser) return;
    setLoadingFollow(true);

    const followerId = auth.currentUser.uid;
    const followDoc = doc(db, 'followers', `${followerId}_${store.id}`);

    try {
      if (isFollowing) {
        await deleteDoc(followDoc);
      } else {
        await setDoc(followDoc, {
          userId: followerId,
          storeId: store.id,
          createdAt: Date.now()
        });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following store:', error);
    } finally {
      setLoadingFollow(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.toLocaleString('fr-FR', { month: 'long' });
    return `créé en ${month} ${date.getFullYear()}`;
  };

  const navigateToStore = () => {
    navigation.navigate('StoreDetails', { storeId: store.id });
  };

  return (
    <TouchableOpacity onPress={navigateToStore}>
      <View style={styles.container}>
        <Image 
          source={{ uri: store.imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
        
        <View style={styles.headerContainer}>
          <View style={styles.storeInfo}>
            <Text style={styles.name}>{store.name}</Text>
            <Text style={styles.handle}>@{store.handle}</Text>
            <Text style={styles.createdAt}>{formatDate(store.createdAt)}</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                loadingFollow && styles.loadingButton
              ]}
              onPress={handleFollow}
              disabled={loadingFollow}
            >
              <Text style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText
              ]}>
                {isFollowing ? 'Fidélisé' : 'Se fidéliser'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.ownerButton}
              onPress={onOwnerPress}
            >
              <Text style={styles.ownerButtonText}>Propriétaire</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text 
          style={styles.description}
          numberOfLines={2}
        >
          {store.description}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{store.products}</Text>
            <Text style={styles.statLabel}>Articles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{store.followers}</Text>
            <Text style={styles.statLabel}>Fidèles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{store.following}</Text>
            <Text style={styles.statLabel}>Fidélisations</Text>
          </View>
        </View>

        <View style={styles.productsGrid}>
          {store.recentProducts?.slice(0, 6).map((imageUrl, index) => (
            <Image
              key={index}
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  storeInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  createdAt: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  followingButton: {
    backgroundColor: theme.colors.secondary,
  },
  loadingButton: {
    opacity: 0.7,
  },
  followButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: 'white',
  },
  ownerButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ownerButtonText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.xs,
  },
  productImage: {
    width: '33.33%',
    aspectRatio: 1,
    padding: theme.spacing.xs,
  },
});

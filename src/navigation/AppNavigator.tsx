import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList, AuthStackParamList, HomeStackParamList, ProfileStackParamList, StoreStackParamList } from './types';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, reload } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { CompleteProfileScreen } from '../screens/auth/CompleteProfileScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { StoreDetailsScreen } from '../screens/store/StoreDetailsScreen';
import { ProductDetailsScreen } from '../screens/product/ProductDetailsScreen';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { SearchScreen } from '../screens/search/SearchScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { CreateStoreScreen } from '../screens/store/CreateStoreScreen';
import { StoreDashboardScreen } from '../screens/store/StoreDashboardScreen';
import { StoreProfileScreen } from '../screens/store/StoreProfileScreen';
import { AddEditProductScreen } from '../screens/store/AddEditProductScreen';
import { EditProductScreen } from '../screens/store/EditProductScreen';
import { ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { AddressesScreen } from '../screens/profile/AddressesScreen';
import { PaymentMethodsScreen } from '../screens/profile/PaymentMethodsScreen';
import { ActiveOrdersScreen } from '../screens/profile/ActiveOrdersScreen';
import { OrderHistoryScreen } from '../screens/profile/OrderHistoryScreen';
import { NotificationSettingsScreen } from '../screens/profile/NotificationSettingsScreen';
import { PrivacyScreen } from '../screens/profile/PrivacyScreen';
import { HelpScreen } from '../screens/profile/HelpScreen';
import { StoreProductsScreen } from '../screens/store/StoreProductsScreen';
import { StoreOrdersScreen } from '../screens/store/StoreOrdersScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const StoreStack = createNativeStackNavigator<StoreStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="StoreDetails" component={StoreDetailsScreen} />
      <HomeStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </HomeStack.Navigator>
  );
};

const AuthStackNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <AuthStack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </AuthStack.Navigator>
  );
};

const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator 
      screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <ProfileStack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          headerShown: false 
        }}
      />
      <ProfileStack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ 
          title: 'Modifier le profil' 
        }}
      />
      <ProfileStack.Screen 
        name="CreateStore" 
        component={CreateStoreScreen}
        options={{ 
          title: 'Créer une boutique' 
        }}
      />
      <ProfileStack.Screen 
        name="StoreDashboard" 
        component={StoreDashboardScreen}
        options={{ 
          title: 'Tableau de bord',
          headerBackTitle: 'Retour au profil'
        }}
      />
      <ProfileStack.Screen 
        name="StoreProducts" 
        component={StoreProductsScreen}
        options={{ 
          title: 'Mes produits' 
        }}
      />
      <ProfileStack.Screen 
        name="StoreOrders" 
        component={StoreOrdersScreen}
        options={{ 
          title: 'Commandes' 
        }}
      />
      <ProfileStack.Screen 
        name="AddProduct" 
        component={AddEditProductScreen}
        options={{ 
          title: 'Ajouter un produit' 
        }}
      />
      <ProfileStack.Screen 
        name="EditProduct" 
        component={EditProductScreen}
        options={({ navigation }) => ({
          title: 'Modifier le produit',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <ProfileStack.Screen 
        name="StoreProfile" 
        component={StoreProfileScreen}
        options={{ 
          title: 'Profil de la boutique' 
        }}
      />
      <ProfileStack.Screen 
        name="Addresses" 
        component={AddressesScreen}
        options={{ 
          title: 'Mes adresses' 
        }}
      />
      <ProfileStack.Screen 
        name="PaymentMethods" 
        component={PaymentMethodsScreen}
        options={{ 
          title: 'Moyens de paiement' 
        }}
      />
      <ProfileStack.Screen 
        name="ActiveOrders" 
        component={ActiveOrdersScreen}
        options={{ 
          title: 'Commandes en cours' 
        }}
      />
      <ProfileStack.Screen 
        name="OrderHistory" 
        component={OrderHistoryScreen}
        options={{ 
          title: 'Historique des commandes' 
        }}
      />
      <ProfileStack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{ 
          title: 'Notifications' 
        }}
      />
      <ProfileStack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ 
          title: 'Confidentialité' 
        }}
      />
      <ProfileStack.Screen 
        name="Help" 
        component={HelpScreen}
        options={{ 
          title: 'Aide' 
        }}
      />
    </ProfileStack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'CartTab') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ 
          headerShown: false,
          title: 'Accueil'
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          headerShown: false,
          title: 'Rechercher',
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          headerShown: false,
          title: 'Panier',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          headerShown: false,
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Fonction pour vérifier l'état de l'email
  const checkEmailVerification = async (user: any) => {
    try {
      if (!user) return;
      await reload(user);
      const isVerified = user.emailVerified;
      console.log('Email verification statu:', isVerified);
      setIsEmailVerified(isVerified);
      return isVerified; // Retourner l'état pour pouvoir arrêter l'intervalle
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || '');
        
        // Vérifier immédiatement l'état de l'email
        const isVerified = await checkEmailVerification(user);
        
        // Écouter les changements du profil utilisateur
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (doc) => {
          setHasCompletedProfile(doc.exists());
          setLoading(false);
        }, (error) => {
          console.error('Error listening to profile changes:', error);
          setLoading(false);
        });

        // Vérifier périodiquement l'état de l'email seulement s'il n'est pas vérifié
        let emailCheckInterval: NodeJS.Timeout | null = null;
        if (!isVerified) {
          emailCheckInterval = setInterval(async () => {
            const currentVerificationStatus = await checkEmailVerification(user);
            if (currentVerificationStatus) {
              // Si l'email est vérifié, arrêter l'intervalle
              if (emailCheckInterval) {
                clearInterval(emailCheckInterval);
                emailCheckInterval = null;
                console.log('Email verification check stopped - email is verified');
              }
            }
          }, 2000);
        }

        return () => {
          unsubscribeDoc();
          if (emailCheckInterval) {
            clearInterval(emailCheckInterval);
          }
        };
      } else {
        setIsAuthenticated(false);
        setHasCompletedProfile(false);
        setIsEmailVerified(false);
        setUserEmail('');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStackNavigator} />
        ) : !isEmailVerified ? (
          <Stack.Screen 
            name="EmailVerification" 
            component={EmailVerificationScreen}
            initialParams={{ email: userEmail }}
          />
        ) : !hasCompletedProfile ? (
          <Stack.Screen 
            name="CompleteProfile" 
            component={CompleteProfileScreen}
            initialParams={{ email: userEmail }}
          />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { theme } from '../../theme/theme';
import { Input } from '../../components/common/Input';
import { PasswordInput } from '../../components/common/PasswordInput';
import { Button } from '../../components/common/Button';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen = ({ navigation }: RegisterScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);
      
      if (!email || !password) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Mettre à jour le displayName de l'utilisateur
      const displayName = email.split('@')[0]; // Utilise la partie avant @ comme nom par défaut
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      // Envoyer l'email de vérification
      await sendEmailVerification(userCredential.user);

      // Rediriger vers l'écran de vérification
      navigation.navigate('EmailVerification', { 
        email,
        userId: userCredential.user.uid
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Erreur',
        error.code === 'auth/email-already-in-use'
          ? 'Cette adresse email est déjà utilisée'
          : 'Une erreur est survenue lors de l\'inscription'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>HUBBLE</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.inactiveTab}>SE CONNECTER</Text>
        </TouchableOpacity>
        <Text style={[styles.activeTab, { color: theme.colors.primary }]}>S'INSCRIRE</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>ADRESSE EMAIL</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Entrez votre email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>MOT DE PASSE</Text>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Button
          onPress={handleRegister}
          loading={loading}
          style={styles.button}
        >
          <Text style={styles.buttonText}>S'INSCRIRE</Text>
        </Button>
      </View>

      <Text style={styles.terms}>
        En vous inscrivant, vous acceptez de recevoir des offres exclusives et les dernières nouveautés par email.
        Si vous ne souhaitez plus recevoir d'emails, vous pourrez vous désinscrire à tout moment.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.xl,
  },
  activeTab: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inactiveTab: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
    color: theme.colors.textSecondary,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  terms: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

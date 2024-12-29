import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { Button } from '../../components/common/Button';
import { auth } from '../../services/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import * as EmailLink from 'react-native-email-link';

interface EmailVerificationScreenProps {
  navigation: any;
  route?: {
    params?: {
      email?: string;
      userId?: string;
    };
  };
}

export const EmailVerificationScreen = ({ navigation, route }: EmailVerificationScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [userEmail, setUserEmail] = useState(route?.params?.email || auth.currentUser?.email || '');
  const maxRetries = 5;

  const checkEmailVerification = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await reload(user);
      if (user.emailVerified) {
        setNetworkError(false);
        // Ne plus naviguer directement, laisser AppNavigator gérer la navigation
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error checking email verification:', error);
      if (error.code === 'auth/network-request-failed') {
        setNetworkError(true);
      }
      return false;
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const runCheck = async () => {
      console.log('Running periodic email verification check...');
      const isVerified = await checkEmailVerification();
      if (!isVerified && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 16000);
        timeoutId = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      }
    };

    runCheck();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [retryCount]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [timer, canResend]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('App became active, checking email verification...');
        checkEmailVerification();
      }
    });

    // Vérification initiale
    checkEmailVerification();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setTimer(60);
        setCanResend(false);
        setNetworkError(false);
        setRetryCount(0);
        Alert.alert('Succès', 'Un nouveau mail de vérification a été envoyé');
      }
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      if (error.code === 'auth/network-request-failed') {
        Alert.alert(
          'Erreur de connexion',
          'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.'
        );
      } else {
        Alert.alert('Erreur', 'Impossible d\'envoyer le mail de vérification');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmail = async () => {
    try {
      await EmailLink.openInbox();
    } catch (error) {
      console.error('Error opening email app:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application mail');
    }
  };

  const handleRetry = () => {
    setNetworkError(false);
    setRetryCount(0);
    checkEmailVerification();
  };

  if (networkError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Erreur de connexion</Text>
          <Text style={styles.errorText}>
            Impossible de vérifier votre email. Veuillez vérifier votre connexion internet.
          </Text>
          <Button
            onPress={handleRetry}
            style={styles.retryButton}
            loading={loading}
          >
            <Text style={styles.buttonText}>RÉESSAYER</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✉️</Text>
        </View>

        <Text style={styles.title}>Vérification de l'email</Text>
        
        <Text style={styles.description}>
          Nous avons envoyé un email de vérification à{' '}
          <Text style={styles.emailHighlight}>{userEmail}</Text>
        </Text>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Comment vérifier votre email :</Text>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>
              Ouvrez l'email avec pour objet "Verify your email for Hubble"
            </Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>
              Cliquez sur le lien "Verify your email address"
            </Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>
              Revenez sur cette application pour continuer
            </Text>
          </View>
        </View>

        <Button
          onPress={handleOpenEmail}
          style={styles.button}
          variant="primary"
        >
          <Text style={styles.buttonText}>OUVRIR LA MESSAGERIE</Text>
        </Button>

        <View style={styles.resendContainer}>
          {canResend ? (
            <Button
              onPress={handleResendEmail}
              loading={loading}
              variant="secondary"
              style={styles.resendButton}
            >
              <Text style={styles.resendText}>RENVOYER L'EMAIL</Text>
            </Button>
          ) : (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                Renvoyer l'email dans {timer}s
              </Text>
              <View style={[styles.timerBar, { width: `${(timer / 60) * 100}%` }]} />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconText: {
    fontSize: 40,
  },
  errorContainer: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  retryButton: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  description: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  emailHighlight: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  stepNumber: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginRight: theme.spacing.sm,
    width: 20,
  },
  stepText: {
    flex: 1,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  resendButton: {
    width: '100%',
  },
  resendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  timerText: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  timerBar: {
    height: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';

export const PaymentMethodsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Moyens de paiement (À implémenter)</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';

export const OrderHistoryScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Historique des commandes (À implémenter)</Text>
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

import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme/theme';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  loading?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
}

export const Button = ({ onPress, children, loading = false, style, disabled = false }: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.button,
        style,
        disabled && styles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
});

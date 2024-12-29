/**
 * Formate un nombre en prix FCFA
 * @param amount - Le montant à formater
 * @returns Le montant formaté en FCFA
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

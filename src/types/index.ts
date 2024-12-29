export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  storeName?: string;
  storeId?: string;
  bio?: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  username: string; // Identifiant unique de la boutique (@...)
  description: string;
  logo: string;
  bannerImage: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  categories: string[];
  rating: number;
  totalProducts: number;
  reviewCount: number;
  followers: number;
  following: number; // Nombre de fidélisations
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'active' | 'suspended';
  metrics: {
    totalSales: number;
    totalProducts: number;
    totalOrders: number;
    averageRating: number;
  };
}

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type Color = {
  name: string;
  code: string;
};

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  createdAt: number;
  // Spécifique aux vêtements
  sizes: Size[];
  colors: Color[];
  brand: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  style?: string;
  material?: string;
  measurements?: {
    chest?: number;
    length?: number;
    sleeve?: number;
    waist?: number;
  };
}

export interface StoreProduct {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  brand?: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  sizes: string[];
  colors: string[];
  stock: number;
  status: 'active' | 'inactive' | 'draft';
  tags: string[];
  specifications: {
    [key: string]: string;
  };
  measurements?: {
    bust?: number;
    waist?: number;
    hips?: number;
    length?: number;
    [key: string]: number | undefined;
  };
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  id: string;
  productId: string;
  storeId: string;
  userId: string;
  quantity: number;
  selectedSize?: Size;
  selectedColor?: Color;
  price: number;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem extends CartItem {
  productName: string;
  productImage: string;
}

export type OrderStatus = 
  | 'pending'     // En attente de confirmation du vendeur
  | 'confirmed'   // Confirmée par le vendeur
  | 'preparing'   // En cours de préparation
  | 'ready'       // Prête pour la livraison/retrait
  | 'cancelled';  // Annulée

export interface StoreOrder {
  id: string;
  orderId: string;
  storeId: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  userId: string;
  ordersByStore: { [storeId: string]: StoreOrder };
  totalAmount: number;
  createdAt: number;
  updatedAt: number;
  deliveryInfo?: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface StoreMetrics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  rating: number;
  pendingOrders: number;
  recentOrders: {
    id: string;
    orderId: string;
    amount: number;
    createdAt: number;
    status: OrderStatus;
  }[];
  topProducts: {
    id: string;
    name: string;
    image: string;
    totalSales: number;
    revenue: number;
  }[];
}

export interface StoreFollower {
  userId: string;
  storeId: string;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
  addresses: {
    manual?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    geolocation?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  createdAt: number;
  updatedAt: number;
}

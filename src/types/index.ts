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
  description: string;
  logo: string;
  bannerImage: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  followers: number;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'inactive' | 'pending';
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

export interface StoreMetrics {
  dailySales: {
    date: string;
    amount: number;
    orders: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  recentOrders: {
    id: string;
    date: string;
    amount: number;
    status: string;
  }[];
  customerStats: {
    total: number;
    new: number;
    returning: number;
  };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  selectedSize: Size;
  selectedColor: Color;
  price: number;
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

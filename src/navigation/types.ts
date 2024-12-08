export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  CompleteProfile: { email: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  StoreDetails: { storeId: string };
  ProductDetails: { productId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  CreateStore: undefined;
  StoreDashboard: { storeId: string };
  AddProduct: { storeId: string };
  EditProduct: { storeId: string; productId: string; mode: 'edit' };
  StoreProfile: { storeId: string };
};

export type StoreStackParamList = {
  StoreDashboard: { storeId: string };
  AddProduct: { storeId: string };
  EditProduct: { storeId: string; productId: string };
  StoreProfile: { storeId: string };
  ProductDetails: { productId: string };
};

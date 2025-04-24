export interface TShirtOrderFile {
  path: string;
  url: string;
  thumbnail?: {
    path: string;
    url: string;
  };
}

export interface TShirtOrder {
  id: string;
  file: TShirtOrderFile;
  checkoutId: string;
  orderId: string;
  userId: string;
  userEmail: string;
}

export interface TShirtOrderResponse {
  success: boolean;
  message: string;
  data?: TShirtOrder & {
    files?: { key: string; url: string }[];
    orderData?: OrderData;
  };
}

export interface TShirtOrdersResponse {
  success: boolean;
  message: string;
  data?: Array<TShirtOrder & {
    files?: { key: string; url: string }[];
    orderData?: OrderData;
  }>;
}

export interface OrderData {
  checkoutId: string;
  orderId: string;
  userId: string;
  userEmail: string;
  tshirt: {
    file: string;
    fileUrl: string;
    thumbnail?: {
      path: string;
      url: string;
    };
    size: string;
    color: string;
  };
} 
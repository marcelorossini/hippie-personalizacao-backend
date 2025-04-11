export interface TShirtOrderFile extends Express.Multer.File {
  path: string;
  url: string;
  thumbnail?: {
    path: string;
    url: string;
  };
}

export interface TShirtOrder {
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

export interface OrderData {
  checkoutId: string;
  orderId: string;
  userId: string;
  userEmail: string;
  tshirts: {
    file: string;
    fileUrl: string;
    thumbnail?: {
      path: string;
      url: string;
    };
    size: string;
    color: string;
  }[];
} 
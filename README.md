# T-Shirt Order Server

A Node.js server built with Express and TypeScript for handling custom t-shirt orders.

## Features

- Upload custom t-shirt designs
- Create orders with checkout ID and user information
- Query orders by checkout ID
- File upload handling with Multer

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (optional):
```
PORT=3000
```

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```
The `start` script uses [PM2](https://pm2.keymetrics.io/) to keep the
server running continuously. Ensure PM2 is installed globally with
`npm install -g pm2` or as a project dependency.

## API Endpoints

### Create T-Shirt Order
- **POST** `/api/tshirt/order`
- Content-Type: `multipart/form-data`
- Required fields:
  - `file`: The t-shirt design file
  - `checkoutId`: Checkout identifier
  - `orderId`: Order identifier
  - `userId`: User identifier
  - `userEmail`: User email

### Get Order by Checkout ID
- **GET** `/api/tshirt/orders/:checkoutId`
- Returns order details for the specified checkout ID

### Health Check
- **GET** `/health`
- Returns server status

## File Storage

Uploaded files are stored in the `uploads` directory and are served statically through the `/uploads` endpoint. 

## Error Handling

This server logs any `unhandledRejection` and `uncaughtException` events. Run `npm test` to confirm the handlers are registered and log errors without crashing.

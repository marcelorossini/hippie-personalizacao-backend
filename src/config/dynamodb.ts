import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'tshirt-orders'; 
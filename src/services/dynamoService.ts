import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../config/dynamodb';
import { OrderData, OrderDataWithId } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DynamoService {
  private docClient: DynamoDBDocumentClient;

  constructor() {
    this.docClient = DynamoDBDocumentClient.from(dynamoClient);
  }

  async saveOrderData(data: OrderData): Promise<string> {
    const { ...orderData } = data;
    const id = uuidv4();
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        id: id,
        ...orderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await this.docClient.send(command);
    return id;
  }

  async getOrderData(id: string): Promise<OrderDataWithId | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          id: id,
        },
      });

      const response = await this.docClient.send(command);
      return response.Item as OrderDataWithId || null;
    } catch (error) {
      console.error('Erro ao ler dados do pedido:', error);
      return null;
    }
  }

  async getOrderByCheckoutId(checkoutId: string): Promise<OrderDataWithId | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          checkoutId,
        },
      });

      const response = await this.docClient.send(command);
      return response.Item as OrderDataWithId || null;
    } catch (error) {
      console.error('Erro ao ler dados do pedido pelo checkoutId:', error);
      return null;
    }
  }

  async deleteOrderData(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        id: id,
      },
    });

    await this.docClient.send(command);
  }

  async updateOrderData(id: string, updateData: Partial<OrderData>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Prepara as expressões de atualização para cada campo fornecido
    Object.entries(updateData).forEach(([key, value]) => {
      if (key !== 'checkoutId' && key !== 'id') {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      }
    });

    // Adiciona a atualização do campo updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        id: id,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await this.docClient.send(command);
  }

  async find(filters: Record<string, any>): Promise<OrderDataWithId[]> {
    try {
      const filterExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(filters).forEach(([key, value], index) => {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        
        filterExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = value;
      });

      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      const response = await this.docClient.send(command);
      return (response.Items || []) as OrderDataWithId[];
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      return [];
    }
  }

  async findOne(filters: Record<string, any>): Promise<OrderDataWithId | null> {
    const results = await this.find(filters);
    return results[0] || null;
  }

  async updateMany(filters: Record<string, any>, updateData: Partial<OrderData>): Promise<void> {
    try {
      const items = await this.find(filters);
      
      for (const item of items) {
        await this.updateOrderData(item.id, updateData);
      }
    } catch (error) {
      console.error('Erro ao atualizar múltiplos pedidos:', error);
      throw error;
    }
  }

  async deleteMany(filters: Record<string, any>): Promise<void> {
    try {
      const items = await this.find(filters);
      
      for (const item of items) {
        await this.deleteOrderData(item.id);
      }
    } catch (error) {
      console.error('Erro ao deletar múltiplos pedidos:', error);
      throw error;
    }
  }
} 
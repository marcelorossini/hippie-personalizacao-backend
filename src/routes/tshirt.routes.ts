import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { TShirtOrder, TShirtOrderResponse, TShirtOrdersResponse, TShirtOrderFile, OrderData } from '../types';
import { FileService } from '../services/fileService';
import { DynamoService } from '../services/dynamoService';
import { validateRequiredFields } from '../middlewares/validateRequiredFields';
import { sendSuccessResponse, sendErrorResponse, sendNotFoundResponse, sendBadRequestResponse } from '../utils/responseUtils';
import { createFileObject, createOrderPrefix } from '../utils/fileUtils';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
const fileService = new FileService();
const dynamoService = new DynamoService();
fs.mkdirSync('tmp', { recursive: true });

// Função utilitária para filtrar parâmetros vazios
const filterEmptyParams = (query: Record<string, any>): Record<string, any> => {
  return Object.entries(query).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

// Configure multer to use disk storage to avoid keeping large files in memory
const upload = multer({
  storage: multer.diskStorage({
    destination: 'tmp/',
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // limite de 100MB
  }
});

// Route to create a new t-shirt order
router.post('/order', 
  uploadLimiter,
  upload.single('file'),
  validateRequiredFields(['userId', 'userEmail', 'size', 'color', 'checkoutId', 'quantity']),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return sendBadRequestResponse(res, 'Nenhum arquivo foi enviado');
      }

      const { checkoutId, orderId, userId, userEmail, size, color, originId, quantity } = req.body;

      // Primeiro, salvar os dados do pedido para obter o ID
      const orderData: OrderData = {
        checkoutId,
        orderId,
        userId,
        userEmail,
        originId,
        quantity,
        tshirt: {
          file: '', // Será atualizado depois
          fileUrl: '', // Será atualizado depois
          size,
          color
        }
      };

      // Salvar data.json primeiro para obter o ID
      const id = await dynamoService.saveOrderData(orderData);
      
      // Agora usar o ID gerado para o prefixo
      const prefix = createOrderPrefix(id);
      
      // Upload do arquivo para o S3
      const result = await fileService.uploadFile(req.file, prefix);
      
      // Criar thumbnail do arquivo
      const thumbnailResult = await fileService.createThumbnail(req.file, prefix);
      
      // Atualizar os dados do pedido com as informações do arquivo
      const updatedOrderData: OrderData = {
        ...orderData,
        tshirt: {
          ...orderData.tshirt,
          file: result.key,
          fileUrl: result.url,
          thumbnail: thumbnailResult ? {
            path: thumbnailResult.key,
            url: thumbnailResult.url
          } : undefined
        }
      };

      // Atualizar o data.json com as informações do arquivo
      await dynamoService.updateOrderData(id, updatedOrderData);

      // Remover arquivo temporário após o processamento
      if (req.file.path) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (err) {
          console.error('Erro ao remover arquivo temporário:', err);
        }
      }

      const order: TShirtOrder = {
        id,
        file: createFileObject(result, thumbnailResult),
        checkoutId,
        orderId,
        userId,
        userEmail,
        quantity
      };

      return sendSuccessResponse(res, 'Pedido criado com sucesso', order, 201);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      return sendErrorResponse(res, 'Erro interno do servidor');
    }
  }
);

// Route to get orders by checkoutId
router.get('/order/:checkoutId', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;
    const prefix = createOrderPrefix(checkoutId);
    
    const orderData = await fileService.getOrderData(prefix);
    
    if (!orderData) {
      return sendNotFoundResponse(res, 'Pedido não encontrado');
    }

    return sendSuccessResponse(res, 'Pedido encontrado com sucesso', {
      checkoutId: orderData.checkoutId,
      orderId: orderData.orderId,
      userId: orderData.userId,
      userEmail: orderData.userEmail,
      quantity: orderData.quantity,
      orderData: orderData
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

// Route to delete all files from a checkout
router.delete('/order/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prefix = createOrderPrefix(id);
    
    const orderData = await fileService.getOrderData(prefix);
    
    if (!orderData) {
      return sendNotFoundResponse(res, 'Pedido não encontrado');
    }

    await fileService.deleteFilesByPrefix(prefix);
    return sendSuccessResponse(res, 'Todos os arquivos do pedido foram excluídos com sucesso');
  } catch (error) {
    console.error('Erro ao excluir arquivos do pedido:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

// Route to update order data
router.put('/order/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return sendBadRequestResponse(res, 'id é obrigatório');
    }

    if (Object.keys(updateData).length === 0) {
      return sendBadRequestResponse(res, 'Nenhum dado para atualizar foi fornecido');
    }

    // Verificar se o pedido existe antes de atualizar
    const existingOrder = await dynamoService.findOne({ id });
    if (!existingOrder) {
      return sendNotFoundResponse(res, 'Pedido não encontrado');
    }

    await dynamoService.updateOrderData(id, updateData);
    return sendSuccessResponse(res, 'Pedido atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

// Rota para buscar um único pedido com filtros
router.get('/order/search/one', async (req: Request, res: Response) => {
  try {
    const filters = filterEmptyParams(req.query);

    if (Object.keys(filters).length === 0) {
      return sendBadRequestResponse(res, 'É necessário fornecer pelo menos um filtro de busca');
    }

    const order = await dynamoService.findOne(filters);

    if (!order) {
      return sendNotFoundResponse(res, 'Pedido não encontrado');
    }

    return sendSuccessResponse(res, 'Pedido encontrado com sucesso', {
      id: order.id,
      file: createFileObject(
        { path: order.tshirt.file, url: order.tshirt.fileUrl },
        order.tshirt.thumbnail
      ),
      checkoutId: order.checkoutId,
      orderId: order.orderId,
      userId: order.userId,
      userEmail: order.userEmail,
      quantity: order.quantity,
      orderData: order
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

// Rota para buscar pedidos com filtros
router.get('/order/search/all', async (req: Request, res: Response) => {
  try {
    const filters = filterEmptyParams(req.query);

    if (Object.keys(filters).length === 0) {
      return sendBadRequestResponse(res, 'É necessário fornecer pelo menos um filtro de busca');
    }

    const orders = await dynamoService.find(filters);

    return sendSuccessResponse(res, 'Pedidos encontrados com sucesso', 
      orders.map(order => ({
        id: order.id,
        file: createFileObject(
          { path: order.tshirt.file, url: order.tshirt.fileUrl },
          order.tshirt.thumbnail
        ),
        checkoutId: order.checkoutId,
        orderId: order.orderId,
        userId: order.userId,
        userEmail: order.userEmail,
        quantity: order.quantity,
        orderData: order
      }))
    );
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

// Rota para atualizar múltiplos pedidos com filtros
router.put('/order/search/update', async (req: Request, res: Response) => {
  try {
    const filters = filterEmptyParams(req.query);
    const updateData = req.body;

    if (Object.keys(filters).length === 0) {
      return sendBadRequestResponse(res, 'É necessário fornecer pelo menos um filtro de busca');
    }

    if (Object.keys(updateData).length === 0) {
      return sendBadRequestResponse(res, 'Nenhum dado para atualizar foi fornecido');
    }

    await dynamoService.updateMany(filters, updateData);
    return sendSuccessResponse(res, 'Pedidos atualizados com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar pedidos:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

// Rota para deletar múltiplos pedidos com filtros
router.delete('/order/search/delete', async (req: Request, res: Response) => {
  try {
    const filters = filterEmptyParams(req.query);

    if (Object.keys(filters).length === 0) {
      return sendBadRequestResponse(res, 'É necessário fornecer pelo menos um filtro de busca');
    }

    // Primeiro, buscar todos os pedidos que correspondem aos filtros
    const orders = await dynamoService.find(filters);
    
    if (orders.length === 0) {
      return sendNotFoundResponse(res, 'Nenhum pedido encontrado com os filtros fornecidos');
    }

    // Para cada pedido, excluir os arquivos do S3 e depois o registro do DynamoDB
    for (const order of orders) {
      const prefix = createOrderPrefix(order.id);
      await fileService.deleteFilesByPrefix(prefix);
    }

    // Deletar os registros do DynamoDB
    await dynamoService.deleteMany(filters);
    
    return sendSuccessResponse(res, 'Pedidos e arquivos deletados com sucesso');
  } catch (error) {
    console.error('Erro ao deletar pedidos:', error);
    return sendErrorResponse(res, 'Erro interno do servidor');
  }
});

export default router; 
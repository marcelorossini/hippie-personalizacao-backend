import { Router, Request, Response } from 'express';
import multer from 'multer';
import { TShirtOrder, TShirtOrderResponse, TShirtOrdersResponse, TShirtOrderFile, OrderData } from '../types';
import { FileService } from '../services/fileService';
import { DynamoService } from '../services/dynamoService';

const router = Router();
const fileService = new FileService();
const dynamoService = new DynamoService();

// Função utilitária para filtrar parâmetros vazios
const filterEmptyParams = (query: Record<string, any>): Record<string, any> => {
  return Object.entries(query).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
};

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // limite de 100MB
  }
});

// Route to create a new t-shirt order
router.post('/order', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      } as TShirtOrderResponse);
    }

    const { checkoutId, orderId, userId, userEmail, size, color } = req.body;

    if (!checkoutId || !orderId || !userId || !userEmail || !size || !color) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando'
      } as TShirtOrderResponse);
    }

    const prefix = `custom-tshirt/${checkoutId}`;
    
    // Upload do arquivo para o S3
    const result = await fileService.uploadFile(req.file, prefix);
    
    // Criar thumbnail do arquivo
    const thumbnailResult = await fileService.createThumbnail(req.file, prefix);

    // Buscar dados existentes do pedido
    const existingData = await fileService.getOrderData(prefix);
    
    // Preparar os dados do pedido
    const orderData: OrderData = {
      checkoutId,
      orderId,
      userId,
      userEmail,
      tshirt: {
        file: result.key,
        fileUrl: result.url,
        thumbnail: thumbnailResult ? {
          path: thumbnailResult.key,
          url: thumbnailResult.url
        } : undefined,
        size,
        color
      }
    };

    // Salvar data.json
    const id = await fileService.saveOrderData(prefix, orderData);

    const order: TShirtOrder = {
      id,
      file: {
        path: result.key,
        url: result.url,
        thumbnail: thumbnailResult ? {
          path: thumbnailResult.key,
          url: thumbnailResult.url
        } : undefined
      } as TShirtOrderFile,
      checkoutId,
      orderId,
      userId,
      userEmail
    };

    return res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      data: order
    } as TShirtOrderResponse);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrderResponse);
  }
});

// Route to get orders by checkoutId
router.get('/order/:checkoutId', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;
    const prefix = `custom-tshirt/${checkoutId}`;
    
    // Buscar dados do data.json
    const orderData = await fileService.getOrderData(prefix);
    
    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      } as TShirtOrderResponse);
    }

    return res.status(200).json({
      success: true,
      message: 'Pedido encontrado',
      data: {
        checkoutId: orderData.checkoutId,
        orderId: orderData.orderId,
        userId: orderData.userId,
        userEmail: orderData.userEmail,
        orderData: orderData
      }
    } as TShirtOrderResponse);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrderResponse);
  }
});

// Route to delete all files from a checkout
router.delete('/order/:checkoutId', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;
    const prefix = `custom-tshirt/${checkoutId}`;
    
    // Buscar dados do data.json para ter certeza que o checkout existe
    const orderData = await fileService.getOrderData(prefix);
    
    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      } as TShirtOrderResponse);
    }

    // Excluir todos os arquivos do checkout
    await fileService.deleteFilesByPrefix(prefix);

    return res.status(200).json({
      success: true,
      message: 'Todos os arquivos do pedido foram excluídos com sucesso'
    } as TShirtOrderResponse);
  } catch (error) {
    console.error('Erro ao excluir arquivos do pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrderResponse);
  }
});

// Route to update order data
router.put('/order/:checkoutId', async (req: Request, res: Response) => {
  try {
    const { checkoutId } = req.params;
    const updateData = req.body;

    if (!checkoutId) {
      return res.status(400).json({
        success: false,
        message: 'CheckoutId é obrigatório'
      } as TShirtOrderResponse);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dado para atualizar foi fornecido'
      } as TShirtOrderResponse);
    }

    await dynamoService.updateOrderData(checkoutId, updateData);

    return res.status(200).json({
      success: true,
      message: 'Pedido atualizado com sucesso'
    } as TShirtOrderResponse);
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrderResponse);
  }
});


// Rota para buscar um único pedido com filtros
router.get('/order/search/one', async (req: Request, res: Response) => {
  try {
    const filters = filterEmptyParams(req.query);

    if (Object.keys(filters).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário fornecer pelo menos um filtro de busca'
      } as TShirtOrderResponse);
    }

    const order = await dynamoService.findOne(filters);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      } as TShirtOrderResponse);
    }

    return res.status(200).json({
      success: true,
      message: 'Pedido encontrado com sucesso',
      data: {
        checkoutId: order.checkoutId,
        orderId: order.orderId,
        userId: order.userId,
        userEmail: order.userEmail,
        orderData: order
      }
    } as TShirtOrderResponse);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrderResponse);
  }
});

// Rota para buscar pedidos com filtros
router.get('/order/search/all', async (req: Request, res: Response) => {
  try {
    console.log(req.query);
    const filters = filterEmptyParams(req.query);

    if (Object.keys(filters).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário fornecer pelo menos um filtro de busca'
      } as TShirtOrdersResponse);
    }

    console.log(filters);

    const orders = await dynamoService.find(filters);

    return res.status(200).json({
      success: true,
      message: 'Pedidos encontrados com sucesso',
      data: orders.map(order => ({
        checkoutId: order.checkoutId,
        orderId: order.orderId,
        userId: order.userId,
        userEmail: order.userEmail,
        orderData: order
      }))
    } as TShirtOrdersResponse);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrdersResponse);
  }
});

// Rota para atualizar múltiplos pedidos com filtros
router.put('/order/search/update', async (req: Request, res: Response) => {
  try {
    const filters = filterEmptyParams(req.query);
    const updateData = req.body;

    if (Object.keys(filters).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário fornecer pelo menos um filtro de busca'
      } as TShirtOrderResponse);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dado para atualizar foi fornecido'
      } as TShirtOrderResponse);
    }

    await dynamoService.updateMany(filters, updateData);

    return res.status(200).json({
      success: true,
      message: 'Pedidos atualizados com sucesso'
    } as TShirtOrderResponse);
  } catch (error) {
    console.error('Erro ao atualizar pedidos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    } as TShirtOrderResponse);
  }
});

export default router; 
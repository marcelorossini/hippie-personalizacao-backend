import { Router, Request, Response } from 'express';
import multer from 'multer';
import { TShirtOrder, TShirtOrderResponse, TShirtOrderFile, OrderData } from '../types';
import { FileService } from '../services/fileService';

const router = Router();
const fileService = new FileService();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limite de 5MB
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
      tshirts: [
        ...(existingData?.tshirts || []),
        {
          file: result.key,
          fileUrl: result.url,
          thumbnail: thumbnailResult ? {
            path: thumbnailResult.key,
            url: thumbnailResult.url
          } : undefined,
          size,
          color
        }
      ]
    };

    // Salvar data.json
    await fileService.saveOrderData(prefix, orderData);

    const order: TShirtOrder = {
      file: {
        ...req.file,
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

export default router; 
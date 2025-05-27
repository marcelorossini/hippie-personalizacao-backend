import { S3Service } from './s3Service';
import { DynamoService } from './dynamoService';
import { Express } from 'express';
import { OrderData } from '../types';
import sharp from 'sharp';

export class FileService {
  private s3Service: S3Service;
  private dynamoService: DynamoService;

  constructor() {
    this.s3Service = new S3Service();
    this.dynamoService = new DynamoService();
  }

  async uploadFile(file: Express.Multer.File, prefix: string = 'uploads'): Promise<{ key: string; url: string }> {
    const key = `${prefix}/${Date.now()}-${file.originalname}`;
    const uploadedKey = await this.s3Service.uploadFile(file, key);
    const signedUrl = await this.s3Service.getSignedUrl(uploadedKey);
    
    return { key: uploadedKey, url: signedUrl };
  }

  async createThumbnail(file: Express.Multer.File, prefix: string = 'uploads'): Promise<{ key: string; url: string } | null> {
    try {
      // Verificar se o arquivo é uma imagem
      if (!file.mimetype.startsWith('image/')) {
        console.log('Arquivo não é uma imagem, thumbnail não será criada');
        return null;
      }

      // Criar thumbnail com Sharp e converter para PNG
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .png() // Converter para PNG
        .toBuffer();

      // Criar um novo arquivo com o buffer da thumbnail
      const thumbnailFile: Express.Multer.File = {
        ...file,
        buffer: thumbnailBuffer,
        originalname: `thumb-${file.originalname.replace(/\.[^/.]+$/, '.png')}`, // Substituir extensão por .png
        mimetype: 'image/png', // Definir mimetype como PNG
        size: thumbnailBuffer.length
      };

      // Fazer upload da thumbnail
      const key = `${prefix}/${Date.now()}-thumb-${file.originalname.replace(/\.[^/.]+$/, '.png')}`;
      const uploadedKey = await this.s3Service.uploadFile(thumbnailFile, key);
      const signedUrl = await this.s3Service.getSignedUrl(uploadedKey);
      
      return { key: uploadedKey, url: signedUrl };
    } catch (error) {
      console.error('Erro ao criar thumbnail:', error);
      return null;
    }
  }

  async getOrderData(prefix: string): Promise<OrderData | null> {
    const checkoutId = prefix.split('/')[1];
    return await this.dynamoService.getOrderData(checkoutId);
  }

  async deleteFilesByPrefix(prefix: string): Promise<void> {
    try {
      // Listar todos os arquivos com o prefixo
      const files = await this.s3Service.listFiles(prefix);
      
      // Excluir cada arquivo
      await Promise.all(files.map(file => this.s3Service.deleteFile(file)));

      // Excluir dados do DynamoDB
      const checkoutId = prefix.split('/')[1];
      await this.dynamoService.deleteOrderData(checkoutId);
    } catch (error) {
      console.error('Erro ao excluir arquivos:', error);
      throw error;
    }
  }
} 
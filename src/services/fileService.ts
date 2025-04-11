import { S3Service } from './s3Service';
import { Express } from 'express';
import { OrderData } from '../types';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3';
import sharp from 'sharp';

export class FileService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
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

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return await this.s3Service.getSignedUrl(key, expiresIn);
  }

  async listFilesWithUrls(prefix: string): Promise<{ key: string; url: string }[]> {
    const files = await this.s3Service.listFiles(prefix);
    const filesWithUrls = await Promise.all(
      files.map(async (key) => ({
        key,
        url: await this.s3Service.getSignedUrl(key)
      }))
    );
    return filesWithUrls;
  }

  async saveOrderData(prefix: string, data: OrderData): Promise<void> {
    const key = `${prefix}/data.json`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    });

    await s3Client.send(command);
  }

  async getOrderData(prefix: string): Promise<OrderData | null> {
    try {
      const key = `${prefix}/data.json`;
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      const data = await response.Body?.transformToString();
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao ler data.json:', error);
      return null;
    }
  }
} 
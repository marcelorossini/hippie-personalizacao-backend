import { Response } from 'express';
import { TShirtOrderResponse, TShirtOrdersResponse } from '../types';

export const sendSuccessResponse = (res: Response, message: string, data?: any, statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendErrorResponse = (res: Response, message: string, statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

export const sendNotFoundResponse = (res: Response, message: string = 'Recurso não encontrado') => {
  return sendErrorResponse(res, message, 404);
};

export const sendBadRequestResponse = (res: Response, message: string) => {
  return sendErrorResponse(res, message, 400);
}; 
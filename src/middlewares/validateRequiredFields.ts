import { Request, Response, NextFunction } from 'express';
import { sendBadRequestResponse } from '../utils/responseUtils';

export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return sendBadRequestResponse(
        res,
        `Campos obrigatórios faltando: ${missingFields.join(', ')}`
      );
    }
    
    next();
  };
}; 
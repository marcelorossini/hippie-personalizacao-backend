import { Request, Response, NextFunction } from 'express';

// Pass-through middleware that doesn't limit anything
export const globalLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const authLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const uploadLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
}; 
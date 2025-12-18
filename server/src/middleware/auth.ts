import { Request, Response, NextFunction } from 'express';
import { playerService } from '../services/PlayerService';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  playerId?: string;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required'
      },
      timestamp: new Date()
    });
  }

  const decoded = playerService.verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      },
      timestamp: new Date()
    });
  }

  req.playerId = decoded.playerId;
  next();
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = playerService.verifyToken(token);
    if (decoded) {
      req.playerId = decoded.playerId;
    }
  }

  next();
};
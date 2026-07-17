import { UserRole } from '../../src/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        rol: UserRole;
      };
    }
  }
}

export {};

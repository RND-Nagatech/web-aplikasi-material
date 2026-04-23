import { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler = <Req extends Request = Request>(
  handler: (req: Req, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req as Req, res, next)).catch(next);
  };
};

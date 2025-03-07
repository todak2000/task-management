import { Response } from 'express';

 const successHandler = (
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    status: statusCode,
    message,
    data
  });
};

export default successHandler
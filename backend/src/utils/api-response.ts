import type { Response } from 'express';

/** Every successful API response uses this envelope. */
export interface ApiSuccessResponse<TData> {
  success: true;
  message: string;
  data: TData;
}

/** Every failed API response uses this envelope. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: string[];
}

export const sendSuccess = <TData>(
  res: Response,
  statusCode: number,
  message: string,
  data: TData,
): Response<ApiSuccessResponse<TData>> =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  errors?: string[],
): Response<ApiErrorResponse> =>
  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors && errors.length > 0 ? { errors } : {}),
  });

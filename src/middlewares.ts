import express from 'express';

const notFound = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

/* eslint-disable no-unused-vars */
const errorHandler = (err: Error , req: express.Request, res: express.Response, next: express.NextFunction): void => {
  /* eslint-enable no-unused-vars */
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
}

export default {
  notFound,
  errorHandler
};

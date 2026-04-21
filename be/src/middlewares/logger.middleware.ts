import morgan from 'morgan';

const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const loggerMiddleware = morgan(format, {
  stream: {
    write: (message: string) => {
      console.log(`[HTTP] ${message.trim()}`);
    },
  },
});

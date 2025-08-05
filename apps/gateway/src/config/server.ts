export const serverConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  environment: process.env.NODE_ENV || 'development',
};

export default () => ({
  port: process.env.PORT,
  database: {
    url: process.env.DB_URL,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  cloud: {
    apiKey: process.env.CLOUD_API_KEY,
  },
  access: {
    jwt_secret: process.env.JWT_SECRET,
  },
});
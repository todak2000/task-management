import dotenv from "dotenv";

dotenv.config();

const jwtConfig =  {
  secret: `${process.env.JWT_SECRET}`,
  refreshSecret: `${process.env.JWT_REFRESH_SECRET}`,
};

export default jwtConfig
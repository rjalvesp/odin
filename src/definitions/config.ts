export interface ConfigEnv {
  name: string;
  isProduction: boolean;
}

export interface ConfigServer {
  port: number;
}

export interface ConfigDB {
  mainConnectionString?: string;
}

export interface CustomConfig {
  db: ConfigDB;
  env: ConfigEnv;
  server: ConfigServer;
}

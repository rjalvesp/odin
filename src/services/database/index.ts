import postgres from "postgres";
import config from "config";
import { ConfigDB } from "@definitions/interfaces/config";

const { mainConnectionString } = config.get<ConfigDB>("db");
console.log(mainConnectionString);
export const coreDb = postgres(`${mainConnectionString}`);

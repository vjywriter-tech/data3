import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

let client: S3Client | null = null;

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getR2Config(): R2Config {
  return {
    accountId: requiredEnvironmentValue("R2_ACCOUNT_ID"),
    accessKeyId: requiredEnvironmentValue("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironmentValue("R2_SECRET_ACCESS_KEY"),
    bucketName: requiredEnvironmentValue("R2_BUCKET_NAME"),
  };
}

export function getR2Client() {
  if (client) return client;

  const config = getR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
}

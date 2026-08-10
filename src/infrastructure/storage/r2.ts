import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 is S3-compatible.
 * Secrets stay server-side only (no NEXT_PUBLIC_*).
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`إعداد R2 ناقص: ${name}`);
  return value;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

export function getR2Client(): S3Client {
  const accountId = required('R2_ACCOUNT_ID');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
  });
}

export function getR2PublicUrl(objectKey: string): string {
  const base = required('R2_PUBLIC_URL').replace(/\/$/, '');
  const key = objectKey.replace(/^\//, '');
  return `${base}/${key}`;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const client = getR2Client();
  const bucket = required('R2_BUCKET_NAME');
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
  return getR2PublicUrl(params.key);
}

import AWS, { S3 } from "aws-sdk";

const {
  AWS_S3_REGION: region,
  AWS_ACCESS_KEY_ID: accessKeyId,
  AWS_SECRET_ACCESS_KEY: secretAccessKey,
  AWS_S3_BUCKET: Bucket,
  AWS_S3_ACL: ACL,
} = process.env;

AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region,
});

const s3 = new AWS.S3();

export default {
  read: (Key: S3.ObjectKey) =>
    s3.getObject({ Key, Bucket } as S3.Types.GetObjectRequest).promise(),
  save: (Key: S3.ObjectKey, content: S3.Body) =>
    s3
      .putObject({
        Bucket,
        Key,
        ACL,
        Body: content,
      } as S3.Types.PutObjectRequest)
      .promise(),
};

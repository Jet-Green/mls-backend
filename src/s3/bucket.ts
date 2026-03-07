import * as AWS from 'aws-sdk'
// не трогать! иначе не будет env
import 'dotenv/config'

class YandexCloud {
  aws: any

  constructor() {
    this.aws = new AWS.S3({
      endpoint: 'https://storage.yandexcloud.net',
      accessKeyId: process.env.YC_KEY_ID, // берем ключ из переменной окружения
      secretAccessKey: process.env.YC_SECRET, // берем секрет из переменной окружения
      region: 'ru-central1',
      httpOptions: {
        timeout: 10000,
        connectTimeout: 10000
      },
    });
  }

  Upload = async ({ file, path, fileName }): Promise<any> => {
    try {
      const params = {
        Bucket: process.env.YC_BUCKET_NAME, // название созданного bucket
        Key: `${path}/${fileName}`, // путь и название файла в облаке (path без слэша впереди)
        Body: file.buffer, // сам файл
        ContentType: 'text/plain', // тип файла
      }

      const aws = this.aws
      const result = await new Promise(function (resolve, reject) {

        aws.upload(params, function (err, data) {
          if (err) return reject(err);
          return resolve(data);
        });
      });
      return result;
    } catch (e) {

      console.error(e);
    }
  }

  public async generatePresignedUrl(objectKey: string) {
    try {
      const params = {
        Bucket: process.env.YC_BUCKET_NAME,
        Key: objectKey,
        Expires: 60 * 5, // URL expiration time in seconds
        ContentType: 'application/octet-stream', // Set the content type
      };
      const url = await this.aws.getSignedUrlPromise('putObject', params);
      return url;
    } catch (error) {
      console.error('Error generating pre-signed URL', error);
      throw error;
    }
  }
  public async uploadVideo(fileBuffer: Buffer, presignedUrl: string) {
    // const response = await fetch(presignedUrl, {
    //   method: 'PUT',
    //   body: fileBuffer,
    //   headers: {
    //     'Content-Type': 'application/octet-stream',
    //     // Optionally set other headers
    //   },
    // });

    // if (!response.ok) {
    //   throw new Error(`Upload failed: ${response.statusText}`);
    // }

    // console.log('File uploaded successfully!', response);
    // return response
  }

  public async listObjects(params: {
    folder?: string;
    limit?: number;
    continuationToken?: string;
  }) {
    const { folder = 'photos', limit = 50, continuationToken } = params;

    const result = await this.aws.listObjectsV2({
      Bucket: process.env.YC_BUCKET_NAME,
      Prefix: `${folder}/`,
      MaxKeys: limit,
      ContinuationToken: continuationToken,
    }).promise();

    return {
      items: (result.Contents || [])
        .filter((item) => item.Key)
        .map((item) => ({
          key: item.Key!,
          url: `https://${process.env.YC_BUCKET_NAME}.storage.yandexcloud.net/${item.Key}`,
          size: item.Size || 0,
          lastModified: item.LastModified || null,
        })),
      isTruncated: Boolean(result.IsTruncated),
      nextContinuationToken: result.NextContinuationToken || null,
    };
  }

  public async getPresignedUrl(objectKey: string, expiresIn: number = 3600) {
    try {
      const params = {
        Bucket: process.env.YC_BUCKET_NAME,
        Key: objectKey,
        Expires: expiresIn, // время жизни ссылки в секундах
      };

      const url = await this.aws.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('Error generating presigned URL', error);
      throw error;
    }
  }

  // Метод для получения нескольких URL сразу
  public async getPresignedUrls(objectKeys: string[], expiresIn: number = 3600) {
    return Promise.all(
      objectKeys.map(key => this.getPresignedUrl(key, expiresIn))
    );
  }
}

const YaCloud = new YandexCloud();
export default YaCloud
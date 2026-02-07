import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME') || 'onboarding-documents';
    
    const isLocal = this.configService.get('NODE_ENV') === 'development';

    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || 'test',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || 'test',
      },
      // Configuración Clave para LocalStack:
      ...(isLocal ? {
        endpoint: 'http://localhost:4566', // Apunta a LocalStack
        forcePathStyle: true,              // Usa http://host/bucket/key en vez de http://bucket.host/key
      } : {}),
    });

    this.logger.log(`S3Service initialized in ${isLocal ? 'LOCAL' : 'CLOUD'} mode`);
    
    // Auto-crear bucket en local si no existe (opcional, ayuda mucho en dev)
    if (isLocal) {
      this.createBucketIfNotExists();
    }
  }

  // Helper para inicializar el entorno local
private async createBucketIfNotExists() {
  try {
    // Verifica si existe
    await this.s3Client.send(
      new HeadBucketCommand({ Bucket: this.bucketName }),
    );

    this.logger.log(`Bucket '${this.bucketName}' ya existe.`);
  } catch (error) {
    // Si no existe, lo crea
    await this.s3Client.send(
      new CreateBucketCommand({ Bucket: this.bucketName }),
    );

    this.logger.log(`Bucket local '${this.bucketName}' creado.`);
  }
}


  async uploadFile(file: Express.Multer.File, businessId: string, type: DocumentType): Promise<string> {
    const timestamp = Date.now();
    // Reemplaza caracteres raros para evitar problemas
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `businesses/${businessId}/${type}/${timestamp}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
    return s3Key;
  }

  async getPresignedUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// ---------------------------------------------------------------------------
// Mock the entire AWS SDK before any imports resolve
// ---------------------------------------------------------------------------

const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'PutObject' })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'GetObject' })),
    HeadBucketCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'HeadBucket' })),
    CreateBucketCommand: jest.fn().mockImplementation((input) => ({ input, _type: 'CreateBucket' })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

const BUSINESS_ID = 'business-uuid-1';

const makeMockFile = (): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'my tax file.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('pdf content'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'my tax file.pdf',
  path: '',
});

function makeConfigService(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    AWS_S3_BUCKET_NAME: 'test-bucket',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    NODE_ENV: 'production', // prevents auto-bucket-create in most tests
  };
  return {
    get: jest.fn((key: string) => overrides[key] ?? defaults[key]),
  };
}

describe('S3Service', () => {
  let service: S3Service;

  // Reset mocks before each test; re-create service inside groups that need
  // specific config (e.g. local vs production)
  beforeEach(() => {
    jest.clearAllMocks();
    // HeadBucketCommand succeeds by default (bucket exists)
    mockSend.mockResolvedValue({});
  });

  async function buildService(configOverrides: Record<string, string> = {}) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: ConfigService, useValue: makeConfigService(configOverrides) },
      ],
    }).compile();
    return module.get<S3Service>(S3Service);
  }

  describe('initialization', () => {
    it('creates the service without throwing', async () => {
      service = await buildService();
      expect(service).toBeDefined();
    });

    it('uses the bucket name from config', async () => {
      service = await buildService({ AWS_S3_BUCKET_NAME: 'my-custom-bucket' });
      expect(service).toBeDefined(); // bucket name used internally; verified via uploadFile
    });

    it('does NOT attempt to create the bucket in production mode', async () => {
      service = await buildService({ NODE_ENV: 'production' });
      // Give any async constructor work a tick to settle
      await new Promise((r) => setTimeout(r, 0));
      // HeadBucketCommand and CreateBucketCommand should not have been called
      expect(HeadBucketCommand).not.toHaveBeenCalled();
      expect(CreateBucketCommand).not.toHaveBeenCalled();
    });

    it('checks if bucket exists on startup in development mode', async () => {
      service = await buildService({ NODE_ENV: 'development' });
      await new Promise((r) => setTimeout(r, 0));
      expect(HeadBucketCommand).toHaveBeenCalled();
    });

    it('creates the bucket if it does not exist in development mode', async () => {
      // HeadBucketCommand throws → bucket doesn't exist → CreateBucketCommand called
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucket fails
        .mockResolvedValueOnce({});                        // CreateBucket succeeds

      service = await buildService({ NODE_ENV: 'development' });
      await new Promise((r) => setTimeout(r, 0));

      expect(CreateBucketCommand).toHaveBeenCalled();
    });

    it('does not create the bucket if it already exists in development mode', async () => {
      // HeadBucketCommand succeeds → bucket exists → no CreateBucketCommand
      mockSend.mockResolvedValueOnce({});

      service = await buildService({ NODE_ENV: 'development' });
      await new Promise((r) => setTimeout(r, 0));

      expect(CreateBucketCommand).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    beforeEach(async () => {
      service = await buildService();
      mockSend.mockResolvedValue({}); // PutObjectCommand succeeds
    });

    it('returns a well-formed S3 key', async () => {
      const file = makeMockFile();
      const key = await service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);

      // Format: businesses/<businessId>/<type>/<timestamp>-<sanitized_filename>
      expect(key).toMatch(
        new RegExp(`^businesses/${BUSINESS_ID}/TAX_CERTIFICATE/\\d+-my_tax_file\\.pdf$`),
      );
    });

    it('sanitizes special characters in the filename (spaces → underscores)', async () => {
      const file = makeMockFile(); // originalname: 'my tax file.pdf'
      const key = await service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);
      expect(key).not.toContain(' ');
      expect(key).toContain('my_tax_file.pdf');
    });

    it('sends a PutObjectCommand to S3', async () => {
      const file = makeMockFile();
      await service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      expect(mockSend).toHaveBeenCalled();
    });

    it('uses the correct bucket name from config', async () => {
      const file = makeMockFile();
      await service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: 'test-bucket' }),
      );
    });

    it('includes businessId and document type in the S3 key path', async () => {
      const file = makeMockFile();
      const key = await service.uploadFile(file, BUSINESS_ID, DocumentType.REGISTRATION);
      expect(key).toContain(BUSINESS_ID);
      expect(key).toContain('REGISTRATION');
    });

    it('generates unique keys for uploads at different times', async () => {
      const file = makeMockFile();
      const key1 = await service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);
      // Advance timer slightly
      await new Promise((r) => setTimeout(r, 2));
      const key2 = await service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE);
      expect(key1).not.toBe(key2);
    });

    it('propagates errors thrown by S3', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 upload failed'));
      const file = makeMockFile();
      await expect(
        service.uploadFile(file, BUSINESS_ID, DocumentType.TAX_CERTIFICATE),
      ).rejects.toThrow('S3 upload failed');
    });
  });

  // -------------------------------------------------------------------------
  // getPresignedUrl
  // -------------------------------------------------------------------------
  describe('getPresignedUrl', () => {
    const s3Key = `businesses/${BUSINESS_ID}/TAX_CERTIFICATE/123-tax.pdf`;
    const presignedUrl = 'https://s3.amazonaws.com/test-bucket/tax.pdf?X-Amz-Signature=abc123';

    beforeEach(async () => {
      service = await buildService();
      mockGetSignedUrl.mockResolvedValue(presignedUrl);
    });

    it('returns a presigned URL string', async () => {
      const result = await service.getPresignedUrl(s3Key);
      expect(result).toBe(presignedUrl);
    });

    it('calls getSignedUrl with a GetObjectCommand for the correct key', async () => {
      await service.getPresignedUrl(s3Key);

      expect(GetObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Key: s3Key, Bucket: 'test-bucket' }),
      );
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it('sets expiry to 3600 seconds (1 hour)', async () => {
      await service.getPresignedUrl(s3Key);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(), // s3Client
        expect.anything(), // GetObjectCommand instance
        { expiresIn: 3600 },
      );
    });

    it('propagates errors thrown by getSignedUrl', async () => {
      mockGetSignedUrl.mockRejectedValueOnce(new Error('Signing failed'));
      await expect(service.getPresignedUrl(s3Key)).rejects.toThrow('Signing failed');
    });
  });
});
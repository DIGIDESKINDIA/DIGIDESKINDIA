import { Readable } from "node:stream";
import {
  CompressPDFJob,
  CompressPDFParams,
  CompressionLevel,
  CompressPDFResult,
  ContentEncryption,
  EncryptionAlgorithm,
  ExportPDFToImagesJob,
  ExportPDFToImagesOutputType,
  ExportPDFToImagesParams,
  ExportPDFToImagesResult,
  ExportPDFToImagesTargetFormat,
  MimeType,
  PDFServices,
  ProtectPDFJob,
  ProtectPDFParams,
  ProtectPDFResult,
  RemoveProtectionJob,
  RemoveProtectionParams,
  RemoveProtectionResult,
  ServicePrincipalCredentials,
} from "@adobe/pdfservices-node-sdk";
import type { Asset } from "@adobe/pdfservices-node-sdk";

export class AdobeConfigurationError extends Error {
  constructor() {
    super("PDF processing is not configured. Set PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET.");
    this.name = "AdobeConfigurationError";
  }
}

function getServices() {
  const clientId = process.env.PDF_SERVICES_CLIENT_ID?.trim();
  const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new AdobeConfigurationError();
  }

  return new PDFServices({
    credentials: new ServicePrincipalCredentials({ clientId, clientSecret }),
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function runJob<T extends object>(
  input: Uint8Array,
  jobFactory: (services: PDFServices, inputAsset: Asset) => object,
  resultType: new (...args: never[]) => T,
  resultAsset: (result: T) => Asset | Asset[]
): Promise<Buffer | Buffer[]> {
  const services = getServices();
  let inputAsset: Asset | undefined;
  const outputAssets: Asset[] = [];

  try {
    inputAsset = await services.upload({
      readStream: Readable.from(Buffer.from(input)),
      mimeType: MimeType.PDF,
    });

    const pollingURL = await services.submit({
      job: jobFactory(services, inputAsset) as never,
    });
    const response = await services.getJobResult({ pollingURL, resultType: resultType as never }) as { result: T | null };
    if (!response.result) {
      throw new Error("Adobe PDF processing returned no result.");
    }

    const assets = resultAsset(response.result);
    const list = Array.isArray(assets) ? assets : [assets];
    outputAssets.push(...list);

    const contents = await Promise.all(
      list.map(async (asset) => streamToBuffer((await services.getContent({ asset })).readStream))
    );

    return contents.length === 1 ? contents[0] : contents;
  } finally {
    for (const asset of [...outputAssets, ...(inputAsset ? [inputAsset] : [])]) {
      await services.deleteAsset({ asset }).catch(() => undefined);
    }
  }
}

const compressionLevels: Record<string, CompressionLevel> = {
  low: CompressionLevel.LOW,
  medium: CompressionLevel.MEDIUM,
  high: CompressionLevel.HIGH,
};

export async function compressPdf(input: Uint8Array, level: string): Promise<Buffer> {
  const result = await runJob(
    input,
    (_services, inputAsset) => new CompressPDFJob({
      inputAsset,
      params: new CompressPDFParams({
        compressionLevel: compressionLevels[level] ?? CompressionLevel.MEDIUM,
      }),
    }),
    CompressPDFResult,
    (value) => value.asset
  );

  return result as Buffer;
}

export async function pdfToImages(
  input: Uint8Array,
  format: "jpg" | "png"
): Promise<Buffer> {
  const result = await runJob(
    input,
    (_services, inputAsset) => new ExportPDFToImagesJob({
      inputAsset,
      params: new ExportPDFToImagesParams({
        targetFormat: format === "png" ? ExportPDFToImagesTargetFormat.PNG : ExportPDFToImagesTargetFormat.JPEG,
        outputType: ExportPDFToImagesOutputType.ZIP_OF_PAGE_IMAGES,
      }),
    }),
    ExportPDFToImagesResult,
    (value) => value.assets
  );

  return (Array.isArray(result) ? result[0] : result) as Buffer;
}

export async function protectPdf(input: Uint8Array, password: string): Promise<Buffer> {
  const result = await runJob(
    input,
    (_services, inputAsset) => new ProtectPDFJob({
      inputAsset,
      params: new ProtectPDFParams({
        userPassword: password,
        encryptionAlgorithm: EncryptionAlgorithm.AES_256,
        contentEncryption: ContentEncryption.ALL_CONTENT_EXCEPT_METADATA,
      }),
    }),
    ProtectPDFResult,
    (value) => value.asset
  );

  return result as Buffer;
}

export async function unlockPdf(input: Uint8Array, password: string): Promise<Buffer> {
  const result = await runJob(
    input,
    (_services, inputAsset) => new RemoveProtectionJob({
      inputAsset,
      params: new RemoveProtectionParams({ password }),
    }),
    RemoveProtectionResult,
    (value) => value.asset
  );

  return result as Buffer;
}

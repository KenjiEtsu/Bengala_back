import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import { loadEnv } from "../env";
import { decrypt, encrypt, parseMasterKey } from "./crypto";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB (prototype)

function safeName(name: string) {
  const trimmed = name.trim().slice(0, 120);
  return trimmed || "documento";
}

@Injectable()
export class DocumentsService {
  private readonly masterKey: Buffer;

  constructor(private readonly prisma: PrismaService) {
    this.masterKey = parseMasterKey(loadEnv().docsMasterKeyB64);
  }

  async list(userId: string) {
    const docs = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mime: true,
        size: true,
        sha256: true,
        createdAt: true
      }
    });
    return docs.map((d) => ({
      ...d,
      createdAt: d.createdAt.getTime()
    }));
  }

  async upload(userId: string, file: { originalname?: string; mimetype?: string; buffer: Buffer; size: number }) {
    if (!file?.buffer) throw new BadRequestException("Missing file");
    if (file.size <= 0) throw new BadRequestException("Empty file");
    if (file.size > MAX_BYTES) throw new BadRequestException("File too large");

    const name = safeName(file.originalname || "documento");
    const mime = (file.mimetype || "application/octet-stream").slice(0, 120);

    const enc = encrypt(this.masterKey, file.buffer);

    const created = await this.prisma.document.create({
      data: {
        userId,
        name,
        mime,
        size: file.size,
        sha256: enc.sha256Hex,
        encAlg: enc.alg,
        encIv: enc.ivB64,
        encTag: enc.tagB64,
        // Prisma `Bytes` expects a Uint8Array backed by ArrayBuffer.
        // Buffer typing on TS 5.9 can be Uint8Array<ArrayBufferLike>, so convert explicitly.
        encData: new Uint8Array(enc.data)
      },
      select: { id: true, name: true, mime: true, size: true, sha256: true, createdAt: true }
    });

    return { ...created, createdAt: created.createdAt.getTime() };
  }

  async download(userId: string, docId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: docId, userId },
      select: {
        id: true,
        name: true,
        mime: true,
        size: true,
        sha256: true,
        encIv: true,
        encTag: true,
        encData: true
      }
    });
    if (!doc) throw new NotFoundException("Document not found");

    const plain = decrypt(this.masterKey, {
      ivB64: doc.encIv,
      tagB64: doc.encTag,
      data: Buffer.from(doc.encData)
    });

    return {
      filename: doc.name,
      mime: doc.mime,
      bytes: plain,
      sha256: doc.sha256
    };
  }

  async remove(userId: string, docId: string) {
    const deleted = await this.prisma.document.deleteMany({
      where: { id: docId, userId }
    });
    if (!deleted.count) throw new NotFoundException("Document not found");
    return { ok: true };
  }
}

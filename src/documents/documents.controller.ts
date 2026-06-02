import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import type { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { DocumentsService } from "./documents.service";

@UseGuards(AccessTokenGuard)
@Controller("/api/documents")
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get()
  async list(@Req() req: Request) {
    const userId = (req as any).user?.id as string;
    return { ok: true, documents: await this.docs.list(userId) };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }
    })
  )
  async upload(@Req() req: Request, @UploadedFile() file?: any) {
    const userId = (req as any).user?.id as string;
    const doc = await this.docs.upload(userId, {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      buffer: file?.buffer || Buffer.alloc(0),
      size: file?.size || 0
    });
    return { ok: true, document: doc };
  }

  @Get("/:id")
  async download(@Req() req: Request, @Param("id") id: string, @Res() res: Response) {
    const userId = (req as any).user?.id as string;
    const doc = await this.docs.download(userId, id);
    res.header("Content-Type", doc.mime);
    res.header("Content-Disposition", `attachment; filename="${doc.filename.replace(/\"/g, "")}"`);
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Cache-Control", "no-store");
    res.header("Content-Length", String(doc.bytes.length));
    res.send(doc.bytes);
  }

  @Delete("/:id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    const userId = (req as any).user?.id as string;
    return await this.docs.remove(userId, id);
  }
}

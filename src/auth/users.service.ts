import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { hashPassword, verifyPassword } from "./password";
import type { User } from "./auth.types";
import { PrismaService } from "../db/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(userId: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) return null;
    return mapUser(u);
  }

  async getByUsername(usernameRaw: string): Promise<User | null> {
    const username = normalizeUsername(usernameRaw);
    if (!username) return null;
    const u = await this.prisma.user.findUnique({ where: { username } });
    return u ? mapUser(u) : null;
  }

  async register(emailRaw: string, usernameRaw: string, password: string): Promise<User> {
    const email = emailRaw.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new BadRequestException("Invalid email");
    const username = normalizeUsername(usernameRaw);
    if (!username) throw new BadRequestException("Invalid username");
    if (!password || password.length < 10) {
      throw new BadRequestException("Password must be at least 10 chars");
    }
    const pw = hashPassword(password);
    try {
      const created = await this.prisma.user.create({
        data: {
          email,
          username,
          passwordSalt: pw.salt,
          passwordHash: pw.hash
        }
      });
      return mapUser(created);
    } catch {
      // Unique constraints: email/username
      throw new BadRequestException("Email or username already registered");
    }
  }

  async authenticate(identifierRaw: string, password: string): Promise<User> {
    const identifier = identifierRaw.trim().toLowerCase();
    const user =
      (await this.prisma.user.findUnique({ where: { email: identifier } })) ||
      (await this.prisma.user.findUnique({ where: { username: identifier } }));
    // Uniform error to avoid account probing
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return mapUser(user);
  }
}

function normalizeUsername(usernameRaw: string): string {
  const u = usernameRaw.trim().toLowerCase();
  // 3-20 chars: letters, numbers, underscore
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return "";
  return u;
}

function mapUser(u: {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  passwordSalt: string;
  passwordHash: string;
}): User {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    createdAt: u.createdAt.getTime(),
    password: { salt: u.passwordSalt, hash: u.passwordHash }
  };
}

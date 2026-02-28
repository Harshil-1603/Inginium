import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "inginium-secret";
const JWT_EXPIRY = "12h";

export interface JWTPayload {
    userId: number;
    email: string;
    role: Role;
    name: string;
    departmentId?: number | null;
    clubId?: number | null;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function extractTokenFromHeader(
    authHeader: string | null
): string | null {
    if (!authHeader) return null;
    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    return null;
}

export function getUserFromRequest(request: Request): JWTPayload | null {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    try {
        return verifyToken(token);
    } catch {
        return null;
    }
}

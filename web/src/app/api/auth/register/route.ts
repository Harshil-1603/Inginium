import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name, role, rollNumber, departmentId, clubId } =
            body;

        if (!email || !password || !name || !role) {
            return error("Email, password, name, and role are required");
        }

        if (!Object.values(Role).includes(role)) {
            return error("Invalid role");
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return error("Email already registered", 409);
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
                rollNumber: rollNumber || null,
                departmentId: departmentId || null,
                clubId: clubId || null,
            },
        });

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            departmentId: user.departmentId,
            clubId: user.clubId,
        });

        return success(
            {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            },
            201
        );
    } catch (err) {
        console.error("Register error:", err);
        return error("Internal server error", 500);
    }
}

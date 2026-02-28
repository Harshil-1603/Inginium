import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return error("Email and password are required");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return error("Invalid credentials", 401);
        }

        const validPassword = await comparePassword(password, user.password);
        if (!validPassword) {
            return error("Invalid credentials", 401);
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            departmentId: user.departmentId,
            clubId: user.clubId,
        });

        return success({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                departmentId: user.departmentId,
                clubId: user.clubId,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        return error("Internal server error", 500);
    }
}

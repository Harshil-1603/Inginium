import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canApproveResource, canApproveRoom, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/logger";
import { sendApprovalEmail, sendRejectionEmail, sendCancellationEmail } from "@/lib/mailer";
import { promoteFromWaitlist } from "@/lib/waitlist";
import { success, error } from "@/lib/api-response";
import { RequestStatus } from "@prisma/client";

// POST /api/approvals - Approve/Reject/Cancel/Override/Reopen a request
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const body = await request.json();
        const { entityType, entityId, action } = body;

        if (!entityType || !entityId || !action) {
            return error("entityType, entityId, and action are required");
        }

        const validActions = ["APPROVE", "REJECT", "CANCEL", "OVERRIDE", "REOPEN"];
        if (!validActions.includes(action)) {
            return error(`Invalid action. Must be one of: ${validActions.join(", ")}`);
        }

        // Only admin can override or reopen
        if ((action === "OVERRIDE" || action === "REOPEN") && !isAdmin(user)) {
            return error("Only admin can override or reopen requests", 403);
        }

        if (entityType === "RESOURCE_REQUEST") {
            return handleResourceAction(user, entityId, action);
        } else if (entityType === "ROOM_BOOKING") {
            return handleRoomAction(user, entityId, action);
        } else {
            return error("entityType must be RESOURCE_REQUEST or ROOM_BOOKING");
        }
    } catch (err) {
        console.error("Approval error:", err);
        return error("Internal server error", 500);
    }
}

async function handleResourceAction(
    user: import("@/lib/auth").JWTPayload,
    entityId: number,
    action: string
) {
    const req = await prisma.resourceRequest.findUnique({
        where: { id: entityId },
        include: {
            resource: true,
            requester: true,
        },
    });

    if (!req) return error("Resource request not found", 404);

    // Check permissions
    if (action === "APPROVE" || action === "REJECT") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!canApproveResource(user, req.resource)) {
            return error("You don't have permission to approve/reject this request", 403);
        }
    }

    if (action === "CANCEL") {
        // Requester or admin can cancel
        if (req.requesterId !== user.userId && !isAdmin(user)) {
            return error("Only the requester or admin can cancel", 403);
        }
    }

    const oldState = req.status;
    let newStatus: RequestStatus;

    switch (action) {
        case "APPROVE":
            newStatus = RequestStatus.APPROVED;
            break;
        case "REJECT":
            newStatus = RequestStatus.REJECTED;
            break;
        case "CANCEL":
            newStatus = RequestStatus.CANCELLED;
            break;
        case "OVERRIDE":
            newStatus = RequestStatus.OVERRIDDEN;
            break;
        case "REOPEN":
            newStatus = RequestStatus.PENDING;
            break;
        default:
            return error("Invalid action");
    }

    const updated = await prisma.resourceRequest.update({
        where: { id: entityId },
        data: { status: newStatus },
        include: { resource: true, requester: true },
    });

    // Log the action
    await logAction(user, action, "ResourceRequest", entityId, oldState, newStatus);

    // Send email
    if (action === "APPROVE") {
        await sendApprovalEmail(req.requester.email, "Resource", req.resource.name);
    } else if (action === "REJECT") {
        await sendRejectionEmail(req.requester.email, "Resource", req.resource.name);
    } else if (action === "CANCEL") {
        await sendCancellationEmail(req.requester.email, "Resource", req.resource.name);
    }

    return success(updated);
}

async function handleRoomAction(
    user: import("@/lib/auth").JWTPayload,
    entityId: number,
    action: string
) {
    const booking = await prisma.roomBooking.findUnique({
        where: { id: entityId },
        include: {
            room: true,
            requester: true,
        },
    });

    if (!booking) return error("Room booking not found", 404);

    // Check permissions
    if (action === "APPROVE" || action === "REJECT") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!canApproveRoom(user)) {
            return error("Only LHC or admin can approve/reject room bookings", 403);
        }
    }

    if (action === "CANCEL") {
        if (booking.requesterId !== user.userId && !isAdmin(user)) {
            return error("Only the requester or admin can cancel", 403);
        }
    }

    const oldState = booking.status;
    let newStatus: RequestStatus;

    switch (action) {
        case "APPROVE":
            newStatus = RequestStatus.APPROVED;
            break;
        case "REJECT":
            newStatus = RequestStatus.REJECTED;
            break;
        case "CANCEL":
            newStatus = RequestStatus.CANCELLED;
            break;
        case "OVERRIDE":
            newStatus = RequestStatus.OVERRIDDEN;
            break;
        case "REOPEN":
            newStatus = RequestStatus.PENDING;
            break;
        default:
            return error("Invalid action");
    }

    const updated = await prisma.roomBooking.update({
        where: { id: entityId },
        data: {
            status: newStatus,
            queuePosition: newStatus === RequestStatus.APPROVED ? null : booking.queuePosition,
        },
        include: { room: true, requester: true },
    });

    // Log the action
    await logAction(user, action, "RoomBooking", entityId, oldState, newStatus);

    // Send email
    if (action === "APPROVE") {
        await sendApprovalEmail(booking.requester.email, "Room Booking", booking.room.name);
    } else if (action === "REJECT") {
        await sendRejectionEmail(booking.requester.email, "Room Booking", booking.room.name);
    } else if (action === "CANCEL") {
        await sendCancellationEmail(booking.requester.email, "Room Booking", booking.room.name);
    }

    // On cancel/reject of approved booking, promote from waitlist
    if (
        (action === "CANCEL" || action === "REJECT" || action === "OVERRIDE") &&
        oldState === RequestStatus.APPROVED
    ) {
        await promoteFromWaitlist(booking.roomId, booking.startTime, booking.endTime);
    }

    return success(updated);
}

import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

/**
 * Handler to fetch all activity logs.
 * @returns {Promise<NextResponse>} - The response with all activity logs.
 */
export async function GET() {
  try {
    const activityLogs = await prisma.activityLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(activityLogs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json({ error: "Error fetching activity logs" }, { status: 500 });
  }
}


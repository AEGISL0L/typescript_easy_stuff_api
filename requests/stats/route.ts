import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

/**
 * Handler to fetch request statistics.
 * @returns {Promise<NextResponse>} - The response with request statistics.
 */
export async function GET() {
  try {
    const requests = await prisma.request.findMany();
    const total = requests.length;
    const pending = requests.filter(req => req.status === 'pending').length;
    const inProgress = requests.filter(req => req.status === 'in-progress').length;
    const completed = requests.filter(req => req.status === 'completed').length;
    const rejected = requests.filter(req => req.status === 'rejected').length;

    return NextResponse.json({ total, pending, inProgress, completed, rejected });
  } catch (error) {
    console.error("Error fetching request stats:", error);
    return NextResponse.json({ error: 'Failed to fetch request stats' }, { status: 500 });
  }
}

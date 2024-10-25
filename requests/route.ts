import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import Joi from 'joi';

const prisma = new PrismaClient();

const requestSchema = Joi.object({
  userId: Joi.number().required(),
  description: Joi.string().min(10).required(),
  status: Joi.string().valid('pending', 'in-progress', 'completed').default('pending'),
});

const logActivity = async (userId, action, description) => {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      description,
    },
  });
};

/**
 * Handler to fetch all requests.
 * @returns {Promise<NextResponse>} - The response with all requests.
 */
export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      include: { user: true },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Error fetching requests" }, { status: 500 });
  }
}

/**
 * Handler to create a new request.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with the created request.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { error, value } = requestSchema.validate(body);
    if (error) {
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const newRequest = await prisma.request.create({
      data: value,
    });

    await logActivity(newRequest.userId, 'CREATE', `Created a new request with ID ${newRequest.id}`);

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating request:", error.message);
    return NextResponse.json({ error: "Error creating request" }, { status: 500 });
  }
}

/**
 * Handler to update a request by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with the updated request.
 */
export async function PUT(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  try {
    const body = await req.json();
    const { error, value } = requestSchema.validate(body, { allowUnknown: true, abortEarly: false });
    if (error) {
      return NextResponse.json({ error: error.details.map(e => e.message).join(', ') }, { status: 400 });
    }

    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(id) },
      data: value,
    });

    await logActivity(updatedRequest.userId, 'UPDATE', `Updated request with ID ${updatedRequest.id}`);

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json({ error: "Error updating request" }, { status: 500 });
  }
}

/**
 * Handler to delete a request by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response confirming deletion.
 */
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  try {
    const deletedRequest = await prisma.request.delete({ where: { id: parseInt(id) } });
    await logActivity(deletedRequest.userId, 'DELETE', `Deleted request with ID ${deletedRequest.id}`);
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json({ error: "Error deleting request" }, { status: 500 });
  }
}

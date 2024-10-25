import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import Joi from 'joi';

const prisma = new PrismaClient();

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
});

/**
 * Handler to fetch a single user by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with the user data.
 */
export async function GET(req) {
  const id = req.url.split('/').pop();
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Error fetching user" }, { status: 500 });
  }
}

/**
 * Handler to update a user by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with the updated user data.
 */
export async function PUT(req) {
  const id = req.url.split('/').pop();
  try {
    const body = await req.json();
    const { error } = updateUserSchema.validate(body, { allowUnknown: true, abortEarly: false });
    if (error) {
      return NextResponse.json({ error: error.details.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { username, password, email } = body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { username, password: hashedPassword, email }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error updating user" }, { status: 500 });
  }
}

/**
 * Handler to delete a user by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response confirming deletion.
 */
export async function DELETE(req) {
  const id = req.url.split('/').pop();
  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}

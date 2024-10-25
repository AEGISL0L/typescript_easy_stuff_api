// src/api/users/route.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import Joi from 'joi';

const prisma = new PrismaClient();

const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('user', 'admin').required(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional(),
  password: Joi.string().min(8).optional(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
});

/**
 * Handler to fetch users or a single user by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with user(s) data.
 * 
 * Notas Importantes:
 * - Si se proporciona un ID de usuario, busca y devuelve el usuario correspondiente con su rol y perfil.
 * - Si no se proporciona un ID, devuelve todos los usuarios con sus roles y perfiles.
 * - Se incluyen mensajes de depuración para rastrear las solicitudes de búsqueda.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      console.log(`Fetching user with id: ${id}`);
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: { role: true, profile: true }
      });

      if (!user) {
        console.log(`User with id: ${id} not found`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      console.log(`User with id: ${id} found`);
      return NextResponse.json(user);
    } else {
      console.log('Fetching all users');
      const users = await prisma.user.findMany({
        include: { role: true, profile: true }
      });
      console.log(`Fetched ${users.length} users`);
      return NextResponse.json(users);
    }
  } catch (error) {
    console.error("Error fetching user(s):", error.message, error.stack);
    return NextResponse.json({ error: "Error fetching user(s)" }, { status: 500 });
  }
}

/**
 * Handler to create a new user.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with the created user data.
 * 
 * Notas Importantes:
 * - Valida los datos de entrada utilizando Joi para asegurar que se cumplen los requisitos de formato.
 * - Cifra la contraseña del usuario antes de guardarla en la base de datos.
 * - Verifica la existencia del rol antes de crear el usuario.
 * - Crea un perfil de usuario asociado con la información opcional proporcionada.
 * - Incluye mensajes de depuración para rastrear el proceso de creación del usuario.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { error } = userSchema.validate(body);
    if (error) {
      console.log("Validation error:", error.details[0].message);
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { username, email, password, role, firstName, lastName, phone, address } = body;
    console.log("Creating user:", username, email, role);
    const hashedPassword = await bcrypt.hash(password, 10);

    const roleData = await prisma.role.findUnique({
      where: { name: role }
    });

    if (!roleData) {
      console.log("Role not found:", role);
      return NextResponse.json({ error: "Role not found" }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: {
          connect: { id: roleData.id }
        },
        profile: {
          create: {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone || '',
            address: address || '',
          }
        }
      }
    });

    console.log("User created successfully:", newUser.id);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error.message, error.stack);
    if (error.message.includes("Unique constraint failed")) {
      console.log("Username or email already exists");
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error creating user" }, { status: 500 });
  }
}

/**
 * Handler to update a user by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response with the updated user data.
 * 
 * Notas Importantes:
 * - Valida los datos de entrada utilizando Joi para asegurar que se cumplen los requisitos de formato.
 * - Cifra la nueva contraseña del usuario si se proporciona.
 * - Actualiza el perfil del usuario si se proporciona información adicional.
 * - Incluye mensajes de depuración para rastrear el proceso de actualización del usuario.
 */
export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    console.log("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    console.log("Invalid user id:", id);
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    console.log(`Updating user with id: ${id}`);
    const { error } = updateUserSchema.validate(body, { allowUnknown: true, abortEarly: false });
    if (error) {
      console.log("Validation error:", error.details.map(e => e.message).join(', '));
      return NextResponse.json({ error: error.details.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { username, password, email, firstName, lastName, phone, address } = body;
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    console.log(`Update data for user with id ${userId}:`, updateData);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    if (firstName || lastName || phone || address) {
      console.log(`Updating profile for user id: ${id}`);
      await prisma.userProfile.upsert({
        where: { userId },
        update: { firstName, lastName, phone, address },
        create: { userId, firstName, lastName, phone, address }
      });
    }

    console.log(`User with id: ${id} updated successfully`);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error.message, error.stack);
    return NextResponse.json({ error: "Error updating user" }, { status: 500 });
  }
}

/**
 * Handler to delete a user by ID.
 * @param {Request} req - The request object.
 * @returns {Promise<NextResponse>} - The response confirming deletion.
 * 
 * Notas Importantes:
 * - Elimina primero los registros dependientes (perfil del usuario y solicitudes) para evitar fallos de clave foránea.
 * - Incluye mensajes de depuración para rastrear el proceso de eliminación del usuario.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    console.log("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    console.log("Invalid user id:", id);
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    console.log(`Deleting user with id: ${id}`);

    // Verificar si el usuario tiene un perfil
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Eliminar registros dependientes si existen
    if (userProfile) {
      console.log(`Deleting profile for user id: ${id}`);
      await prisma.userProfile.delete({
        where: { userId },
      });
    }

    console.log(`Deleting requests for user id: ${id}`);
    await prisma.request.deleteMany({
      where: { userId },
    });

    // Luego eliminar el usuario
    await prisma.user.delete({ where: { id: userId } });

    console.log(`User with id: ${id} deleted successfully`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting user:", error.message, error.stack);
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}

// Notas importantes:

//    Validación y manejo de errores: La validación de los datos de usuario utiliza Joi y maneja errores específicos para nombres de usuario y correos electrónicos duplicados.
//    Esquema de validación para actualizaciones: Se ha creado un esquema de validación separado para las actualizaciones (updateUserSchema) que permite la actualización de usuarios sin requerir todos los campos.
//    Manejo de la contraseña en las actualizaciones: La contraseña se actualiza solo si se proporciona una nueva contraseña
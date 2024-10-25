import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        // Buscar el usuario en la base de datos
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { role: { include: { permissions: true } } }
        });

        // Verificar la contraseña
        if (user && bcrypt.compareSync(credentials.password, user.password)) {
          console.log("User authenticated:", {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          });
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: {
              name: user.role.name,
              permissions: user.role.permissions.map(p => p.action)
            }
          };
        } else {
          console.error("Authentication failed for user:", credentials.username);
          return null;
        }
      }
    })
  ],
  callbacks: {
    // Callback para manejar la sesión
    async session({ session, token }) {
      console.log("Session callback - token:", token);
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.email = token.email;
      session.user.role = token.role;
      return session;
    },
    // Callback para manejar el JWT
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT callback - user:", user);
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.role = user.role;
      } else {
        console.log("JWT callback - existing token:", token);
      }
      return token;
    },
    // Callback para manejar las redirecciones
    async redirect({ url, baseUrl }) {
      console.log("Redirecting to:", url);
      // Redirigir a la página principal si la URL empieza con el baseUrl
      return url.startsWith(baseUrl) ? baseUrl : url;
    },
  },
  pages: {
    signIn: '/signin',  // Página para iniciar sesión
    error: '/signin',   // Página de error de autenticación
  },
  secret: process.env.SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

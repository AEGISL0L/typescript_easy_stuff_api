import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, text } = await req.json();

    // Validación de los campos requeridos
    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'Missing email, subject, or text' }, { status: 400 });
    }

    console.log("Received email details:", { to, subject, text });

    // Configuración del transporter utilizando las variables de entorno
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465', // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    };

    // Enviar el correo electrónico y capturar la información de la respuesta
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info);

    return NextResponse.json({ message: 'Correo enviado con éxito', info });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return NextResponse.json({ error: 'Error al enviar el correo', details: error.message }, { status: 500 });
  }
}

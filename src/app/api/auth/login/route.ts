import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { setSessionCookie, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { lawFirm: true }
  });

  if (!user || parsed.data.password !== "password123") {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession({
    userId: user.id,
    lawFirmId: user.lawFirmId,
    email: user.email,
    role: user.role,
    name: user.name
  });

  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}

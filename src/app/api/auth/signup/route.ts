import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { AccessLevel, NotificationType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatus, SUPER_ADMIN_BOOTSTRAPPED_KEY } from "@/lib/auth-bootstrap";
import { getPhoneLookupCandidates, isValidPhoneInput, normalizePhone } from "@/lib/phone-utils";
import {
  createSupabaseAuthUser,
  findSupabaseAuthUserByEmail,
} from "@/lib/supabase-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getBootstrapStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    console.error("Failed to check signup bootstrap status:", err);
    return NextResponse.json(
      { success: false, isFirstSuperAdminAvailable: false, totalUsers: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      contact?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const name = String(body.name || "").trim();
    const rawContact = String(body.contact || body.email || body.phone || "").trim();
    const password = String(body.password || "");

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Full names must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (!rawContact) {
      return NextResponse.json(
        { error: "Please enter your email address or telephone number." },
        { status: 400 }
      );
    }

    const isEmail = rawContact.includes("@");
    let email = "";
    let phone: string | null = null;
    let phoneCandidates: string[] = [];

    if (isEmail) {
      email = rawContact.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }
      const optionalPhone = String(body.phone || "").trim();
      if (optionalPhone) {
        if (!isValidPhoneInput(optionalPhone)) {
          return NextResponse.json(
            { error: "Please enter a valid telephone number." },
            { status: 400 }
          );
        }
        phone = normalizePhone(optionalPhone);
        phoneCandidates = getPhoneLookupCandidates(optionalPhone);
      }
    } else {
      if (!isValidPhoneInput(rawContact)) {
        return NextResponse.json(
          { error: "Please enter a valid email address or telephone number (7-15 digits)." },
          { status: 400 }
        );
      }
      phone = normalizePhone(rawContact);
      phoneCandidates = getPhoneLookupCandidates(rawContact);
      const digitsOnly = phone.replace(/\D/g, "");
      email = `tel.${digitsOnly}@phone.local`;
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...phoneCandidates.map((p) => ({ phone: p })),
        ],
      },
      select: { id: true, email: true, phone: true, deletedAt: true },
    });

    if (existing) {
      if (existing.email === email) {
        return NextResponse.json(
          { error: "An account with this email address already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "An account with this telephone number already exists." },
        { status: 409 }
      );
    }

    const { isFirstSuperAdminAvailable } = await getBootstrapStatus();
    const assignedRole = isFirstSuperAdminAvailable ? Role.SUPER_ADMIN : Role.FIELD_OFFICER;
    const hashedPassword = await bcrypt.hash(password, 10);

    let createdUser: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: Role;
    };

    try {
      createdUser = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: assignedRole,
          isActive: true,
          accessLevel: AccessLevel.ALL,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      });
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : "";
      if (/23505|duplicate key|users_email_key/i.test(msg)) {
        return NextResponse.json(
          {
            error: isEmail
              ? "An account with this email address already exists."
              : "An account with this telephone number already exists.",
          },
          { status: 409 }
        );
      }
      throw createErr;
    }

    // Mirror to Supabase auth.users asynchronously/non-blockingly (email_confirm: true, no email sent)
    try {
      const existingAuthUser = await findSupabaseAuthUserByEmail(email);
      if (!existingAuthUser) {
        await createSupabaseAuthUser({
          email,
          phone,
          password,
          name,
          role: assignedRole,
          publicUserId: createdUser.id,
        });
      }
    } catch (authSyncErr) {
      console.error("Non-blocking Supabase auth.users sync notice:", authSyncErr);
    }

    if (isFirstSuperAdminAvailable) {
      await prisma.systemSetting.upsert({
        where: { key: SUPER_ADMIN_BOOTSTRAPPED_KEY },
        create: {
          key: SUPER_ADMIN_BOOTSTRAPPED_KEY,
          value: "true",
          description: "Tracks whether the initial Super Admin has signed up and claimed master control.",
          updatedById: createdUser.id,
        },
        update: {
          value: "true",
          updatedById: createdUser.id,
        },
      });
    } else {
      try {
        const admins = await prisma.user.findMany({
          where: { role: Role.SUPER_ADMIN, isActive: true, deletedAt: null },
          select: { id: true },
        });
        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "New User Registered",
              message: `${createdUser.name} (${phone || email}) signed up and was assigned default role FIELD_OFFICER. Review or promote from User Management.`,
              type: NotificationType.INFO,
              relatedEntity: "USER",
              relatedEntityId: createdUser.id,
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify admins of new signup:", notifErr);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: createdUser.id,
        role: createdUser.role,
        action: isFirstSuperAdminAvailable ? "BOOTSTRAP_SIGNUP" : "SIGNUP",
        entity: "USER",
        entityId: createdUser.id,
        newValue: {
          name: createdUser.name,
          email: isEmail ? createdUser.email : null,
          phone: createdUser.phone,
          role: createdUser.role,
          firstSuperAdmin: isFirstSuperAdminAvailable,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        isFirstSuperAdmin: isFirstSuperAdminAvailable,
        loginIdentifier: isEmail ? email : phone,
        user: createdUser,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup failed:", err);
    return NextResponse.json(
      { error: "Unable to create account right now. Please try again." },
      { status: 500 }
    );
  }
}

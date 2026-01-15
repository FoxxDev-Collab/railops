import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { layoutId } = await request.json();

    // If layoutId is provided, verify ownership
    if (layoutId) {
      const layout = await db.layout.findFirst({
        where: {
          id: layoutId,
          userId: session.user.id,
        },
      });

      if (!layout) {
        return NextResponse.json({ error: "Layout not found" }, { status: 404 });
      }
    }

    // Update user's selected layout
    await db.user.update({
      where: { id: session.user.id },
      data: { selectedLayoutId: layoutId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error selecting layout:", error);
    return NextResponse.json(
      { error: "Failed to select layout" },
      { status: 500 }
    );
  }
}

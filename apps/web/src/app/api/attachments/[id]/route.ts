import { NextResponse } from "next/server";
import { findAttachmentById, hasEngagementAccess } from "@/lib/data";
import { getArtifactDownload } from "@/lib/storage/provider";
import { getCurrentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const attachment = await findAttachmentById(id);

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const allowed = await hasEngagementAccess({
    userId: session.sub,
    role: session.role,
    engagementId: attachment.engagementId,
  });

  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (session.role !== "founder" && attachment.visibility !== "shared") {
    return NextResponse.json({ error: "Internal artifacts are founder-only" }, { status: 403 });
  }

  const download = await getArtifactDownload(attachment.storageKey, attachment.contentType);

  if (download.type === "redirect") {
    return NextResponse.redirect(download.url);
  }

  return new NextResponse(download.body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": attachment.contentType,
      "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
    },
  });
}

import { NextResponse } from "next/server";
import { audit, findReportById, hasEngagementAccess } from "@/lib/data";
import { renderReportPdf } from "@/lib/pdf";
import { getCurrentSession } from "@/lib/session";
import { getArtifactDownload } from "@/lib/storage/provider";
import { sanitizeAttachmentFileName } from "@/lib/validation";

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

  const report = await findReportById(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const allowed = await hasEngagementAccess({
    userId: session.sub,
    role: session.role,
    engagementId: report.engagementId,
  });

  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (session.role !== "founder" && report.status !== "published") {
    return NextResponse.json({ error: "Draft reports are founder-only" }, { status: 403 });
  }

  if (
    report.status === "published" &&
    report.publishedArtifactStorageKey &&
    report.publishedArtifactContentType
  ) {
    const immutableDownload = await getArtifactDownload(
      report.publishedArtifactStorageKey,
      report.publishedArtifactContentType,
      report.publishedArtifactFileName || `${report.id}.pdf`,
    );
    await audit(session.name, "downloaded_report_pdf", "report", report.id, {
      engagementId: report.engagementId,
      status: report.status,
      source: "immutable-artifact",
    });

    if (immutableDownload.type === "redirect") {
      return NextResponse.redirect(immutableDownload.url, {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    return new NextResponse(Buffer.from(immutableDownload.body), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": immutableDownload.contentType,
        "Content-Disposition": immutableDownload.contentDisposition,
      },
    });
  }

  const bytes = await renderReportPdf(report.reportJson);
  await audit(session.name, "downloaded_report_pdf", "report", report.id, {
    engagementId: report.engagementId,
    status: report.status,
    source: report.status === "published" ? "dynamic-fallback" : "draft-render",
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sanitizeAttachmentFileName(`${id}.pdf`)}"`,
    },
  });
}

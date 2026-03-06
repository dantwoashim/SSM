import { NextResponse } from "next/server";
import { findReportById, hasEngagementAccess } from "@/lib/data";
import { renderReportPdf } from "@/lib/pdf";
import { getCurrentSession } from "@/lib/session";

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

  const bytes = await renderReportPdf(report.reportJson);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${id}.pdf"`,
    },
  });
}

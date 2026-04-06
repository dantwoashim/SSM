import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReportSnapshot } from "@assurance/core";

function wrapText(text: string, maxLength = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function renderReportPdf(snapshot: ReportSnapshot) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  let cursorY = 740;

  const drawLine = (text: string, options?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    const font = options?.bold ? bold : regular;
    const size = options?.size ?? 11;

    if (cursorY < 60) {
      page = pdf.addPage([612, 792]);
      cursorY = 740;
    }

    page.drawText(text, {
      x: 52,
      y: cursorY,
      size,
      font,
      color: rgb(...(options?.color || [0.07, 0.13, 0.18])),
    });
    cursorY -= size + 8;
  };

  drawLine("Identity Go-Live Assurance", { bold: true, size: 22 });
  drawLine(snapshot.engagementTitle, { bold: true, size: 16 });
  drawLine(`Generated: ${new Date(snapshot.generatedAt).toLocaleString()}`);
  drawLine(`Company: ${snapshot.companyName} | Customer: ${snapshot.targetCustomer} | Provider: ${snapshot.provider}`);
  cursorY -= 8;

  drawLine("Executive Summary", { bold: true, size: 14 });
  for (const line of wrapText(snapshot.summary.executiveSummary)) {
    drawLine(line);
  }

  cursorY -= 8;
  drawLine("Scope Boundaries", { bold: true, size: 14 });
  for (const line of wrapText(snapshot.summary.scopeBoundaries)) {
    drawLine(line);
  }

  cursorY -= 8;
  drawLine("Residual Risk", { bold: true, size: 14 });
  for (const line of wrapText(snapshot.summary.residualRisk)) {
    drawLine(line);
  }

  cursorY -= 8;
  drawLine("Scenario Results", { bold: true, size: 14 });
  for (const scenario of snapshot.scenarios) {
    drawLine(`${scenario.title} (${scenario.protocol}) - ${scenario.outcome}`, { bold: true });
    for (const line of wrapText(scenario.buyerSafeReportNote || "No buyer-safe note recorded.")) {
      drawLine(line);
    }
  }

  cursorY -= 8;
  drawLine("Findings", { bold: true, size: 14 });
  if (snapshot.findings.length === 0) {
    drawLine("No open findings recorded.");
  } else {
    for (const finding of snapshot.findings) {
      drawLine(`${finding.title} [${finding.severity}]`, { bold: true });
      for (const line of wrapText(finding.customerSummary)) {
        drawLine(line);
      }
      for (const line of wrapText(`Remediation: ${finding.remediation}`)) {
        drawLine(line);
      }
      for (const line of wrapText(`Buyer-safe note: ${finding.buyerSafeNote}`)) {
        drawLine(line);
      }
    }
  }

  return pdf.save();
}

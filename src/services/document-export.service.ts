import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit-log.service";

type ExportFormat = "docx" | "pdf";

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function exportDocumentVersion(input: {
  documentVersionId: string;
  format: ExportFormat;
  lawFirmId: string;
  actorUserId: string;
}) {
  const version = await prisma.caseDocumentVersion.findUniqueOrThrow({
    where: { id: input.documentVersionId },
    include: {
      document: {
        include: {
          caseMatter: true
        }
      }
    }
  });

  if (
    version.document.caseMatter.lawFirmId !== input.lawFirmId ||
    !["ATTORNEY_APPROVED", "LOCKED_FOR_COURT_USE"].includes(version.status)
  ) {
    throw new Error("Document version is not available for export.");
  }

  const fileBaseName = sanitizeFilename(
    `${version.document.caseMatter.name}-${version.document.name}-v${version.versionNumber}`
  );
  const fileName = `${fileBaseName}.${input.format}`;

  let bytes: Uint8Array;
  let contentType: string;

  if (input.format === "docx") {
    const doc = new Document({
      sections: [
        {
          children: version.content.split("\n").map(
            (line: string) =>
              new Paragraph({
                children: [new TextRun(line || " ")]
              })
          )
        }
      ]
    });

    bytes = await Packer.toBuffer(doc);
    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else {
    const pdf = await PDFDocument.create();
    let page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const fontSize = 11;
    const lineHeight = 15;
    let y = 752;

    for (const line of version.content.split("\n") as string[]) {
      if (y < 40) {
        y = 752;
        page = pdf.addPage([612, 792]);
      }

      page.drawText(line || " ", {
        x: 40,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.12, 0.1),
        maxWidth: 532
      });
      y -= lineHeight;
    }

    bytes = await pdf.save();
    contentType = "application/pdf";
  }

  await recordAuditLog({
    lawFirmId: input.lawFirmId,
    actorUserId: input.actorUserId,
    actionType: `DOCUMENT_EXPORT_${input.format.toUpperCase()}`,
    sourceEntityType: "CaseDocumentVersion",
    sourceEntityId: version.id,
    sourceDocumentId: version.documentId,
    approvalStatus: version.status === "LOCKED_FOR_COURT_USE" ? "LOCKED_FOR_COURT_USE" : "ATTORNEY_APPROVED",
    afterValue: {
      format: input.format,
      fileName
    }
  });

  return {
    bytes,
    fileName,
    contentType
  };
}

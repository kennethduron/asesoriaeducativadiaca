import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPdfDocument } from "./pdf-document";
import type { ReportType } from "./config";
import type { ReportData } from "./types";
import type { ReportFilters } from "./validation";

export async function buildReportPdf(
  type: ReportType,
  data: ReportData,
  filters: ReportFilters,
  generatedAt: Date,
  generatedBy: string,
) {
  return renderToBuffer(
    <ReportPdfDocument
      type={type}
      data={data}
      filters={filters}
      generatedAt={generatedAt}
      generatedBy={generatedBy}
    />,
  );
}

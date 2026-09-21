import OfficeToPdfTool from "@/components/pdf/OfficeToPdfTool";

export default function ExcelToPdfPage() {
  return (
    <OfficeToPdfTool
      title="Excel to PDF"
      description="Convert your spreadsheet into a downloadable PDF."
      accept=".xls,.xlsx,.ods"
      extensions="\\.(xls|xlsx|ods)$"
    />
  );
}

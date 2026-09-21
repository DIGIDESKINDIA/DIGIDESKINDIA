import OfficeToPdfTool from "@/components/pdf/OfficeToPdfTool";

export default function PowerPointToPdfPage() {
  return (
    <OfficeToPdfTool
      title="PowerPoint to PDF"
      description="Convert your presentation into a downloadable PDF."
      accept=".ppt,.pptx,.odp"
      extensions="\\.(ppt|pptx|odp)$"
    />
  );
}

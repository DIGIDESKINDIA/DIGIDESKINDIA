import OfficeToPdfTool from "@/components/pdf/OfficeToPdfTool";

export default function HtmlToPdfPage() {
	return (
		<OfficeToPdfTool
			title="HTML to PDF"
			description="Convert HTML documents into PDF."
			accept=".html,.htm,text/html"
			extensions="\\.(html|htm)$"
		/>
	);
}

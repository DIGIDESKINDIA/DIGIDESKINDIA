import type { Metadata } from "next";
import TextUtilityTool from "@/components/text/TextUtilityTool";

export const metadata: Metadata = {
	title: "Word Counter",
	description: "Count words, characters, sentences, paragraphs, and reading time locally in your browser.",
};

export default function WordCounterPage() {
	return <TextUtilityTool mode="words" />;
}

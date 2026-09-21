// Confirm how to reach real font names (BaseFont) for text items.
import fs from "fs";
const data = new Uint8Array(
  fs.readFileSync("storage/fixtures/ViewDocument.pdf")
);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await doc.getPage(5);

const out = [];
out.push("page own keys: " + Object.keys(page).join(","));
const transport = page._transport;
if (transport) {
  out.push("transport keys: " + Object.keys(transport).slice(0, 30).join(","));
  out.push(
    "transport.commonObjs? " +
      (transport.commonObjs ? typeof transport.commonObjs.get : "no")
  );
}

const tc = await page.getTextContent();
const styleKeys = Object.keys(tc.styles);
out.push("style keys: " + styleKeys.slice(0, 8).join(","));
out.push("styles sample: " + JSON.stringify(tc.styles[styleKeys[0]]));

// try commonObjs lookups for the font ids seen in items
const fontIds = [
  ...new Set(tc.items.map((it) => it.fontName).filter(Boolean)),
];
out.push("item fontIds: " + fontIds.join(","));

const common = transport?.commonObjs ?? page.commonObjs ?? null;
if (common) {
  for (const id of fontIds.slice(0, 6)) {
    try {
      const f = common.get(id);
      out.push(
        `${id} -> name=${f?.name} bold=${f?.bold} italic=${f?.italic} loaded=${f?.loadedName}`
      );
    } catch (e) {
      out.push(`${id} -> ERR ${e.message}`);
    }
  }
}

fs.writeFileSync("storage/font-probe-out.txt", out.join("\n"));
console.log("done");

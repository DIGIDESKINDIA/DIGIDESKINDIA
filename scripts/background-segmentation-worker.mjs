import { removeBackground } from "@imgly/background-removal-node";

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const source = Buffer.from(Buffer.concat(chunks).toString("utf8").trim(), "base64");
  const result = await removeBackground(new Blob([source], { type: "image/png" }), {
    model: "medium",
    output: { format: "image/x-rgba8", quality: 1 },
  });

  process.stdout.write(Buffer.from(await result.arrayBuffer()).toString("base64"));
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

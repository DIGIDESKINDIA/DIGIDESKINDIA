$ErrorActionPreference = "Stop"

$path = "app\api\pdf\compress\route.ts"
$backup = "app\api\pdf\compress\route.ts.before-exact-size"

Write-Host ""
Write-Host "Digital Desk - Installing exact target size finalizer..."
Write-Host ""

if (-not (Test-Path $path)) {
    throw "route.ts not found: $path"
}

Copy-Item $path $backup -Force

$content = Get-Content $path -Raw

# ---------------------------------------------------------
# Add exact-size helper before RESPONSE section
# ---------------------------------------------------------

$marker = "/* =========================================================`r`n   RESPONSE"

if (-not $content.Contains($marker)) {
    $marker = "/* =========================================================`n   RESPONSE"
}

if (-not $content.Contains($marker)) {
    throw "RESPONSE section not found in route.ts"
}

$helper = @'

/* =========================================================
   EXACT TARGET SIZE FINALIZER

   If compression produces a valid PDF below the requested
   target, harmless bytes are appended after %%EOF.

   PDF readers ignore data after the final EOF marker.
   This lets Digital Desk return a file extremely close to
   the requested size without running Ghostscript repeatedly.
========================================================= */

function finalizeToTargetSize(
  buffer: Buffer,
  target: number | null
): Buffer {
  if (!target) {
    return buffer;
  }

  /*
   * Never make an oversized PDF larger.
   */
  if (buffer.length >= target) {
    return buffer;
  }

  const missing =
    target - buffer.length;

  /*
   * Very small difference: simply append whitespace.
   */
  if (missing <= 2) {
    return Buffer.concat([
      buffer,
      Buffer.alloc(missing, 0x20),
    ]);
  }

  /*
   * Data after the PDF %%EOF marker is ignored by normal
   * PDF readers. Use a comment-like padding block.
   */
  const prefix = Buffer.from(
    "\n% DIGITAL-DESK-TARGET-PADDING\n",
    "ascii"
  );

  if (missing <= prefix.length) {
    return Buffer.concat([
      buffer,
      Buffer.alloc(missing, 0x20),
    ]);
  }

  const remaining =
    missing - prefix.length;

  const padding =
    Buffer.alloc(
      remaining,
      0x20
    );

  return Buffer.concat([
    buffer,
    prefix,
    padding,
  ]);
}

'@

$content =
    $content.Replace(
        $marker,
        $helper + $marker
    )

# ---------------------------------------------------------
# Modify response buffer so final output reaches target
# ---------------------------------------------------------

$old = @'
  const buffer =
    await readFile(attempt.path);

  const size =
    buffer.length;
'@

$new = @'
  const compressedBuffer =
    await readFile(attempt.path);

  /*
   * Final size matching.
   *
   * Example:
   * compressed = 19.43 KB
   * requested  = 50 KB
   * final      = 50 KB
   */
  const buffer =
    finalizeToTargetSize(
      compressedBuffer,
      target
    );

  const size =
    buffer.length;
'@

if (-not $content.Contains($old)) {
    throw "Response buffer block not found. No changes written."
}

$content =
    $content.Replace(
        $old,
        $new
    )

Set-Content `
    -Path $path `
    -Value $content `
    -Encoding utf8

Write-Host ""
Write-Host "SUCCESS: Exact target size finalizer installed."
Write-Host "Backup created:"
Write-Host $backup
Write-Host ""
Write-Host "Now run:"
Write-Host "Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue"
Write-Host "npx tsc --noEmit"
Write-Host ""
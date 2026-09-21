# Render DOCX via installed Word (COM) and report real page counts.
$ErrorActionPreference = 'Stop'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0  # wdAlertsNone

try {
  foreach ($path in @(
    'd:\aaj\digital-desk-main (2)\digital-desk-main\storage\fixtures\ViewDocument_current.docx',
    'd:\aaj\digital-desk-main (2)\digital-desk-main\storage\fixtures\ViewDocument_v2.docx'
  )) {
    if (-not (Test-Path $path)) { Write-Output "MISSING $path"; continue }
    $doc = $word.Documents.Open($path, $false, $true)  # ReadOnly
    $pages = $doc.ComputeStatistics(2)                 # wdStatisticPages
    $outPdf = [IO.Path]::ChangeExtension($path, '.rendered.pdf')
    $doc.ExportAsFixedFormat($outPdf, 17)              # wdExportFormatPDF
    $doc.Close($false)
    Write-Output ("{0} -> pages={1} pdf={2}" -f (Split-Path $path -Leaf), $pages, (Test-Path $outPdf))
  }
} finally {
  $word.Quit()
  [Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

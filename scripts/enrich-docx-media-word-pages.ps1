$ErrorActionPreference = 'Stop'
Set-Location "D:\aaj\digital-desk-main (2)\digital-desk-main"
$path = 'output\production-docx-media-inventory.json'
$report = Get-Content $path -Raw | ConvertFrom-Json
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $null
try {
    $doc = $word.Documents.Open((Resolve-Path 'output\digital-118-v2.docx').Path, $false, $true)
    $report.wordPageCount = [int]$doc.ComputeStatistics(2)
    $report.wordInlineShapeCount = [int]$doc.InlineShapes.Count
    $shapes = @($doc.InlineShapes)
    foreach ($item in $report.media) {
        $index = [int]$item.documentOrder - 1
        if ($index -ge 0 -and $index -lt $shapes.Count) {
            $shape = $shapes[$index]
            $item.wordPage = [int]$shape.Range.Information(3)
            $item.wordRangeStart = [int]$shape.Range.Start
            $item.wordRangeEnd = [int]$shape.Range.End
            $item.wordWidth = [double]$shape.Width
            $item.wordHeight = [double]$shape.Height
        } else {
            $item.wordPage = $null
        }
    }
    $report.status = if ($report.wordInlineShapeCount -eq $report.drawingCount) { 'MEASURED' } else { 'COUNT_MISMATCH' }
    $report | ConvertTo-Json -Depth 20 | Set-Content $path -Encoding UTF8
    Write-Host "WORD_PAGES=$($report.wordPageCount)"
    Write-Host "WORD_INLINE_SHAPES=$($report.wordInlineShapeCount)"
    Write-Host "DRAWINGS=$($report.drawingCount)"
    Write-Host "STATUS=$($report.status)"
}
finally {
    if ($null -ne $doc) { $doc.Close($false) }
    $word.Quit()
}
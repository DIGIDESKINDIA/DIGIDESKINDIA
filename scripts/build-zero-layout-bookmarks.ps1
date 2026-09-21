$ErrorActionPreference = 'Stop'

Set-Location "D:\aaj\digital-desk-main (2)\digital-desk-main"

$inputDocx = "output\digital-118-v2.docx"
$outputDocx = "output\digital-118-forensic-v2.docx"

if (-not (Test-Path $inputDocx)) {
    throw "Input DOCX not found: $inputDocx"
}

Copy-Item -Path $inputDocx -Destination $outputDocx -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false

$doc = $word.Documents.Open((Resolve-Path $outputDocx).Path, $false, $true)

$sourcePages = 118
$blocks = @()
foreach ($p in $doc.Paragraphs) {
    $blocks += $p
}

foreach ($i in 0..($sourcePages - 1)) {
    $index = [math]::Floor(($i * $blocks.Count) / $sourcePages)
    if ($index -ge $blocks.Count) { $index = $blocks.Count - 1 }
    $target = $blocks[$index]
    if ($null -eq $target) { continue }
    $name = "PDF_PAGE_" + ($i + 1).ToString('000')
    try {
        if (-not $doc.Bookmarks.Exists($name)) {
            $range = $target.Range
            $doc.Bookmarks.Add($name, $range)
        }
    } catch {
        Write-Warning "Bookmark add failed for $name : $($_.Exception.Message)"
    }
}

$doc.Save()
$doc.Close($true)
$word.Quit()

$word2 = New-Object -ComObject Word.Application
$word2.Visible = $false
$prod = $word2.Documents.Open((Resolve-Path $inputDocx).Path, $false, $true)
$prodPages = [int]$prod.ComputeStatistics(2)
$prod.Close($false)

$forensic = $word2.Documents.Open((Resolve-Path $outputDocx).Path, $false, $true)
$forensicPages = [int]$forensic.ComputeStatistics(2)
$forensic.Close($false)
$word2.Quit()

Write-Host "PRODUCTION_WORD_PAGES=$prodPages"
Write-Host "FORENSIC_V2_WORD_PAGES=$forensicPages"
Write-Host "DELTA=$($forensicPages - $prodPages)"
Write-Host "OUTPUT=$outputDocx"

Get-Item $outputDocx | Select-Object FullName,Length,LastWriteTime | Format-List

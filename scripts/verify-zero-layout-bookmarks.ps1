$ErrorActionPreference = 'Stop'
Set-Location "D:\aaj\digital-desk-main (2)\digital-desk-main"

$productionPath = (Resolve-Path "output\digital-118-v2.docx").Path
$forensicPath = (Resolve-Path "output\digital-118-forensic-v2.docx").Path
$outputPath = "output\actual-source-to-word-page-map-v2.json"
$sourcePageCount = 118

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$production = $null
$forensic = $null

try {
    $production = $word.Documents.Open($productionPath, $false, $true)
    $productionPages = [int]$production.ComputeStatistics(2)
    $production.Close($false)
    $production = $null

    $forensic = $word.Documents.Open($forensicPath, $false, $true)
    $forensicPages = [int]$forensic.ComputeStatistics(2)
    $bookmarks = @()

    for ($page = 1; $page -le $sourcePageCount; $page++) {
        $name = "PDF_PAGE_" + $page.ToString('000')
        if (-not $forensic.Bookmarks.Exists($name)) { continue }
        $range = $forensic.Bookmarks.Item($name).Range
        $text = ([string]$range.Text).Replace("`r", ' ').Replace("`n", ' ').Trim()
        if ($text.Length -gt 220) { $text = $text.Substring(0, 220) }
        $bookmarks += [ordered]@{
            sourcePage = $page
            bookmark = $name
            wordPage = [int]$range.Information(3)
            rangeStart = [int]$range.Start
            rangeEnd = [int]$range.End
            text = $text
        }
    }

    $sourcePagesFound = @($bookmarks | ForEach-Object { $_.sourcePage })
    $missing = @(1..$sourcePageCount | Where-Object { $_ -notin $sourcePagesFound })
    $duplicateWordPages = @($bookmarks | Group-Object wordPage | Where-Object { $_.Count -gt 1 } | ForEach-Object {
        [ordered]@{ wordPage = [int]$_.Name; sourcePages = @($_.Group.sourcePage) }
    })
    $status = if ($productionPages -eq $forensicPages -and $bookmarks.Count -eq $sourcePageCount -and $missing.Count -eq 0) {
        'METADATA_LAYOUT_PRESERVED'
    } else {
        'FORENSIC_METHOD_FAILED'
    }

    $report = [ordered]@{
        timestamp = (Get-Date).ToString('o')
        productionDocx = 'output/digital-118-v2.docx'
        forensicDocx = 'output/digital-118-forensic-v2.docx'
        sourcePageCount = $sourcePageCount
        productionWordPageCount = $productionPages
        forensicWordPageCount = $forensicPages
        pageCountDelta = $forensicPages - $productionPages
        bookmarkCount = $bookmarks.Count
        missingSourcePages = $missing
        duplicateWordPages = $duplicateWordPages
        bookmarks = $bookmarks
        status = $status
    }
    $report | ConvertTo-Json -Depth 20 | Set-Content -Path $outputPath -Encoding UTF8
    Write-Host "PRODUCTION_WORD_PAGES=$productionPages"
    Write-Host "FORENSIC_WORD_PAGES=$forensicPages"
    Write-Host "PAGE_COUNT_DELTA=$($forensicPages - $productionPages)"
    Write-Host "BOOKMARK_COUNT=$($bookmarks.Count)"
    Write-Host "MISSING_SOURCE_PAGES=$($missing.Count)"
    Write-Host "OUTPUT=$outputPath"
    Write-Host "STATUS=$status"
}
finally {
    if ($null -ne $forensic) { $forensic.Close($false) }
    if ($null -ne $production) { $production.Close($false) }
    $word.Quit()
}
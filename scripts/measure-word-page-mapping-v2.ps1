$docPath = 'D:\aaj\digital-desk-main (2)\digital-desk-main\output\digital-118-v2.docx'
$outputPath = 'D:\aaj\digital-desk-main (2)\digital-desk-main\output\word-page-mapping-v2.json'

if (-not (Test-Path $docPath)) {
    Write-Host "DOCX not found: $docPath"
    exit 1
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false

$doc = $word.Documents.Open($docPath, $false, $false)

# Get total page count
$totalPages = $doc.ComputeStatistics(2)
Write-Host "Total Word pages: $totalPages"

# Collect page mapping data
$pageMapping = @{}
$paragraphs = $doc.Paragraphs
$images = $doc.InlineShapes
$tables = $doc.Tables

# Map paragraphs to pages
$sourcePageMarkers = @{}
for ($i = 1; $i -le $paragraphs.Count; $i++) {
    $p = $paragraphs.Item($i)
    $text = [string]$p.Range.Text
    $pageNum = [int]$p.Range.Information(3)  # WdInformation.wdActiveEndPageNumber
    
    # Look for page-break markers in text (these would indicate source page boundaries)
    if ($text -match "^SOURCE_PAGE_(\d+)" -or $text -match "Page_(\d+)") {
        $matches[1] -as [int] | ForEach-Object {
            if (-not $sourcePageMarkers.ContainsKey($_)) {
                $sourcePageMarkers[$_] = $pageNum
            }
        }
    }
}

# Since we don't have explicit markers, use heuristic: 
# Group paragraphs by page and estimate source page based on content density
$pageContent = @{}
for ($i = 1; $i -le $paragraphs.Count; $i++) {
    $p = $paragraphs.Item($i)
    $pageNum = [int]$p.Range.Information(3)
    $text = [string]$p.Range.Text
    $textLen = $text.Length
    
    if (-not $pageContent.ContainsKey($pageNum)) {
        $pageContent[$pageNum] = @{
            paragraphs = 0
            totalTextLength = 0
            tables = 0
            images = 0
            hasPageBreak = $false
        }
    }
    
    $pageContent[$pageNum].paragraphs += 1
    $pageContent[$pageNum].totalTextLength += $textLen
    
    # Check for page breaks
    if ($text -contains [char]12) {
        $pageContent[$pageNum].hasPageBreak = $true
    }
}

# Count tables and images per page
for ($i = 1; $i -le $tables.Count; $i++) {
    $t = $tables.Item($i)
    $pageNum = [int]$t.Range.Information(3)
    if ($pageContent.ContainsKey($pageNum)) {
        $pageContent[$pageNum].tables += 1
    }
}

for ($i = 1; $i -le $images.Count; $i++) {
    $img = $images.Item($i)
    $pageNum = [int]$img.Range.Information(3)
    if ($pageContent.ContainsKey($pageNum)) {
        $pageContent[$pageNum].images += 1
    }
}

# Build mapping: estimate source pages based on content flow
# With 118 source pages → 100 Word pages, we're compressing by ~1.18x
# This suggests roughly 1-2 source pages per Word page on average with some merging

$estimatedSourcePageSpans = @()
$sourcePageCounter = 1
$contentDensityThreshold = 50  # minimal content threshold

for ($w = 1; $w -le $totalPages; $w++) {
    $content = $pageContent[$w]
    if ($null -eq $content) {
        $content = @{
            paragraphs = 0
            totalTextLength = 0
            tables = 0
            images = 0
            hasPageBreak = $false
        }
    }
    
    $density = $content.totalTextLength + ($content.tables * 200) + ($content.images * 300)
    $isContentDense = $density -gt $contentDensityThreshold
    
    # Estimate source pages: assume source pages with high content density map to Word pages
    # Low-density Word pages might contain parts of 2 source pages (merged)
    $estimatedSourceCount = if ($isContentDense) { 1 } else { 1.5 }
    
    $estimatedSourcePageSpans += @{
        wordPage = $w
        paragraphs = $content.paragraphs
        tables = $content.tables
        images = $content.images
        totalTextLength = $content.totalTextLength
        density = $density
        hasPageBreak = $content.hasPageBreak
        estimatedSourcePages = $estimatedSourceCount
    }
}

# Build final report
$report = @{
    timestamp = (Get-Date).ToIsoString()
    sourcePdf = 'ViewDocument_current.rendered.pdf'
    sourcePageCount = 118
    wordPageCount = $totalPages
    pageCompression = [math]::Round(118.0 / $totalPages, 3)
    
    totalParagraphs = $paragraphs.Count
    totalTables = $tables.Count
    totalImages = $images.Count
    
    pageDetails = @($estimatedSourcePageSpans | ForEach-Object {
        [ordered]@{
            wordPage = $_.wordPage
            paragraphCount = $_.paragraphs
            tableCount = $_.tables
            imageCount = $_.images
            estimatedContentHeight_chars = $_.totalTextLength
            contentDensity = $_.density
            hasPageBreak = $_.hasPageBreak
        }
    })
    
    analysis = @{
        totalWordPages = $totalPages
        compression = "118 source pages → $totalPages Word pages"
        compressionRatio = "1:$([math]::Round($totalPages / 118.0, 2))"
        pagesLost = 118 - $totalPages
        possibleCauses = @(
            "Content from multiple source pages fitting on single Word page",
            "Image scaling reducing page footprint",
            "Table reflow reducing vertical space",
            "Paragraph spacing/line height changes",
            "Page break boundaries removed or conditional"
        )
    }
    
    nextDiagnosticSteps = @(
        "Compare source PDF page dimensions with DOCX page dimensions",
        "Measure actual image sizes in source vs DOCX",
        "Measure actual table heights in source vs DOCX",
        "Identify which source pages are being merged",
        "Check if image-only pages are being compressed"
    )
}

$doc.Close($false)
$word.Quit()

$report | ConvertTo-Json -Depth 20 | Set-Content -Path $outputPath
Write-Host "✓ Wrote $outputPath"
Write-Host "TOTAL_WORD_PAGES=$totalPages"
Write-Host "TOTAL_PARAGRAPHS=$($paragraphs.Count)"
Write-Host "TOTAL_TABLES=$($tables.Count)"
Write-Host "TOTAL_IMAGES=$($images.Count)"
Write-Host "PAGE_COMPRESSION=$([math]::Round(118.0 / $totalPages, 2))x"

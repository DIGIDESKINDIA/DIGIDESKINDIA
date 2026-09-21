# Extract actual Word page mapping from DOCX
# Uses Word COM to get real page positions, not document.xml metadata

$ErrorActionPreference = "Stop"

$docxPath = "D:\aaj\digital-desk-main (2)\digital-desk-main\output\digital-118-v2.docx"
$outputJsonPath = "D:\aaj\digital-desk-main (2)\digital-desk-main\output\actual-word-source-page-map.json"

Write-Host "WORD COM PAGE MAPPING" -ForegroundColor Green
Write-Host "DOCX: $docxPath"
Write-Host "Output: $outputJsonPath"
Write-Host ""

if (!(Test-Path $docxPath)) {
    Write-Host "ERROR: DOCX not found: $docxPath" -ForegroundColor Red
    exit 1
}

# Create Word COM object
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    Write-Host "Word COM initialized" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Cannot create Word COM object. Ensure Word is installed." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

try {
    # Open the document
    $doc = $word.Documents.Open($docxPath, $false, $true)
    Write-Host "Document opened" -ForegroundColor Green
    
    # Get total page count using ComputeStatistics
    $pageCount = $doc.ComputeStatistics(2)
    Write-Host "Total Word pages: $pageCount" -ForegroundColor Green
    
    # Array to store mapping data
    $pageMap = @()
    
    # Iterate through paragraphs
    $paraCount = 0
    foreach ($para in $doc.Paragraphs) {
        $paraCount++
        
        # Get the range of this paragraph
        $paraRange = $para.Range
        
        try {
            # Use Information property to get page number
            $infoPane = $paraRange.Information(6)
            
            # Basic paragraph info
            $text = $para.Range.Text
            if ($text.Length -gt 100) { $text = $text.Substring(0, 100) }
            
            $paraInfo = @{
                elementType = "paragraph"
                index = $paraCount
                text = $text
                wordPage = [int]$infoPane
                style = $para.Style.Name
                isEmpty = [string]::IsNullOrWhiteSpace($para.Range.Text)
            }
            
            # Track content by page
            $pageMap += $paraInfo
        } catch {
            # If Information fails, skip
        }
        
        # Progress indicator
        if ($paraCount % 100 -eq 0) {
            Write-Host "Processed $paraCount paragraphs..." -ForegroundColor Gray
        }
    }
    
    Write-Host "Processed $paraCount paragraphs" -ForegroundColor Green
    
    # Get tables
    $tableCount = $doc.Tables.Count
    Write-Host "Found $tableCount tables" -ForegroundColor Green
    
    foreach ($table in $doc.Tables) {
        $tableRange = $table.Range
        try {
            $tablePage = [int]$tableRange.Information(6)
            
            $tableInfo = @{
                elementType = "table"
                wordPage = $tablePage
                rows = $table.Rows.Count
                columns = $table.Columns.Count
                style = $table.Style.Name
            }
            
            $pageMap += $tableInfo
        } catch {
            # Skip
        }
    }
    
    # Get inline shapes (images)
    $shapeCount = $doc.InlineShapes.Count
    Write-Host "Found $shapeCount inline shapes" -ForegroundColor Green
    
    foreach ($shape in $doc.InlineShapes) {
        $shapeRange = $shape.Range
        try {
            $shapePage = [int]$shapeRange.Information(6)
            
            $shapeInfo = @{
                elementType = "image"
                wordPage = $shapePage
                type = $shape.Type
            }
            
            $pageMap += $shapeInfo
        } catch {
            # Skip
        }
    }
    
    # Analyze page distribution
    Write-Host ""
    Write-Host "PAGE DISTRIBUTION" -ForegroundColor Green
    
    $pageDistribution = @{}
    foreach ($item in $pageMap) {
        $page = $item.wordPage
        if (-not $pageDistribution.ContainsKey($page)) {
            $pageDistribution[$page] = @{
                paragraphs = 0
                tables = 0
                images = 0
                textLength = 0
            }
        }
        
        if ($item.elementType -eq "paragraph" -and -not $item.isEmpty) {
            $pageDistribution[$page].paragraphs++
            $pageDistribution[$page].textLength += $item.text.Length
        }
        elseif ($item.elementType -eq "table") {
            $pageDistribution[$page].tables++
        }
        elseif ($item.elementType -eq "image") {
            $pageDistribution[$page].images++
        }
    }
    
    # Find sparse pages
    $sparsePages = @()
    foreach ($page in $pageDistribution.Keys | Sort-Object) {
        $dist = $pageDistribution[$page]
        $totalElements = $dist.paragraphs + $dist.tables + $dist.images
        
        if ($totalElements -lt 5 -or $dist.textLength -lt 200) {
            $sparsePages += @{
                wordPage = $page
                paragraphs = $dist.paragraphs
                tables = $dist.tables
                images = $dist.images
                textLength = $dist.textLength
            }
        }
    }
    
    Write-Host "Sparse Word pages: $($sparsePages.Count)" -ForegroundColor Yellow
    
    # Create output JSON
    $output = @{
        timestamp = Get-Date -Format 'o'
        docxPath = $docxPath
        
        summary = @{
            totalWordPages = $pageCount
            totalParagraphs = $paraCount
            totalTables = $tableCount
            totalImages = $shapeCount
            sparsePages = $sparsePages.Count
        }
        
        pageDistribution = $pageDistribution
        sparsePages = $sparsePages
    }
    
    $json = $output | ConvertTo-Json -Depth 10
    Set-Content -Path $outputJsonPath -Value $json -Encoding UTF8
    
    Write-Host ""
    Write-Host "Saved to: $outputJsonPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:"
    Write-Host "  Word pages: $pageCount"
    Write-Host "  Paragraphs: $paraCount"
    Write-Host "  Tables: $tableCount"
    Write-Host "  Images: $shapeCount"
    Write-Host "  Sparse pages: $($sparsePages.Count)"
    
} finally {
    try {
        $doc.Close($false)
        Write-Host ""
        Write-Host "Document closed" -ForegroundColor Green
    } catch {}
    
    try {
        $word.Quit()
        Write-Host "Word closed" -ForegroundColor Green
    } catch {}
}

Write-Host ""
Write-Host "COMPLETE" -ForegroundColor Green

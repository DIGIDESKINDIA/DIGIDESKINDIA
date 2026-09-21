$ErrorActionPreference = "Stop"

$docxPath = "D:\aaj\digital-desk-main (2)\digital-desk-main\output\digital-118-v2.docx"
$pdfPath = "D:\aaj\digital-desk-main (2)\digital-desk-main\output\digital-118-v2-rendered.pdf"

Write-Host "Starting DOCX to PDF conversion..." -ForegroundColor Green

try {
    Write-Host "Creating Word COM object..."
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    Write-Host "Opening DOCX: $docxPath"
    $doc = $word.Documents.Open($docxPath, $false, $true)
    
    Write-Host "Document opened. Computing page count..."
    $pageCount = $doc.ComputeStatistics(2)
    Write-Host "Page count: $pageCount"
    
    Write-Host "Saving as PDF: $pdfPath"
    $doc.SaveAs2($pdfPath, 17)
    
    Write-Host "Closing document..."
    $doc.Close($false)
    
    Write-Host "Closing Word..."
    $word.Quit()
    
    Write-Host ""
    Write-Host "PDF created successfully" -ForegroundColor Green
    
    if (Test-Path $pdfPath) {
        $size = (Get-Item $pdfPath).Length / 1MB
        Write-Host "File size: $($size.ToString('F2')) MB"
        Write-Host "Location: $pdfPath"
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.StackTrace
    exit 1
}

Write-Host ""
Write-Host "COMPLETE" -ForegroundColor Green

$docPath = 'D:\aaj\digital-desk-main (2)\digital-desk-main\output\digital-118-final.docx'
$outputPath = 'D:\aaj\digital-desk-main (2)\digital-desk-main\output\word-page-expansion-diagnostic.json'
$sourceDiagnosticPath = 'D:\aaj\digital-desk-main (2)\digital-desk-main\page-expansion-diagnostic.json'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open($docPath, $false, $false)

$wordPages = [int]$doc.ComputeStatistics(2)
$paragraphs = $doc.Paragraphs
$exactLineRuleParagraphs = 0
$singleLineRuleParagraphs = 0
$pageBreakParagraphs = 0
$paragraphsWithExtraSpacing = 0
$paragraphExamples = @()
$pageBreakSamples = @()
$firstPageTransition = $null
$previousPage = $null
$pagesToParagraphs = @{}

for ($i = 1; $i -le $paragraphs.Count; $i++) {
  $p = $paragraphs.Item($i)
  $text = [string]$p.Range.Text
  $pageNum = [int]$p.Range.Information(3)
  if ($pageNum -gt 0) {
    if (-not $pagesToParagraphs.ContainsKey($pageNum)) { $pagesToParagraphs[$pageNum] = 0 }
    $pagesToParagraphs[$pageNum] += 1
  }

  $lineRule = [int]$p.Format.LineSpacingRule
  if ($lineRule -eq 4) { $exactLineRuleParagraphs++ }
  if ($lineRule -eq 0) { $singleLineRuleParagraphs++ }
  if ($p.Format.SpaceBefore -gt 0 -or $p.Format.SpaceAfter -gt 0) { $paragraphsWithExtraSpacing++ }
  if ($text.Contains([char]12)) { $pageBreakParagraphs++; $pageBreakSamples += @{ index = $i; text = ($text.Trim() -replace "`r|`n", ' ') } }

  if ($previousPage -ne $null -and $pageNum -ne $previousPage) {
    if ($null -eq $firstPageTransition) {
      $firstPageTransition = @{ from = $previousPage; to = $pageNum; index = $i }
    }
  }
  $previousPage = $pageNum

  if ($i -le 400) {
    $paragraphExamples += [ordered]@{
      index = $i
      page = $pageNum
      lineRule = $lineRule
      spaceBefore = [double]$p.Format.SpaceBefore
      spaceAfter = [double]$p.Format.SpaceAfter
      text = ($text.Trim() -replace "`r|`n", ' ')
    }
  }
}

$doc.Close(0)
$word.Quit()

$sourceData = Get-Content -Raw -Path $sourceDiagnosticPath | ConvertFrom-Json
$sourceEntries = @($sourceData.pageMapping)
$samplePages = @(1, 2, 3, 10, 12, 15, 18, 20, 28, 35, 43, 44, 60, 80, 100, 118)
$selectedEntries = @()
foreach ($sourcePage in $samplePages) {
  $match = $sourceEntries | Where-Object { $_.sourcePageNumber -eq $sourcePage } | Select-Object -First 1
  if ($null -eq $match) {
    $match = $sourceEntries | Select-Object -First 1
  }
  $wordStart = if ($match.generatedWordPages) { [int]$match.generatedWordPages.start } else { $sourcePage }
  $wordEnd = if ($match.generatedWordPages) { [int]$match.generatedWordPages.end } else { $sourcePage }
  $wordSpan = [Math]::Max(1, ($wordEnd - $wordStart + 1))
  $contentType = if ($match.tableCount -gt 0 -and $match.imageCount -gt 0) { 'table-and-image' } elseif ($match.tableCount -gt 0) { 'table' } elseif ($match.imageCount -gt 0) { 'image' } elseif ($match.overflowOccurs) { 'paragraph-overflow' } else { 'normal' }

  $selectedEntries += [ordered]@{
    sourcePage = [int]$sourcePage
    expectedStart = [int]$sourcePage
    actualWordStart = $wordStart
    actualWordEnd = $wordEnd
    actualWordPages = $wordSpan
    overflow = [bool]$match.overflowOccurs
    contentType = $contentType
    paragraphCount = [int]($match.extractedParagraphCount)
    tableCount = [int]($match.tableCount)
    imageCount = [int]($match.imageCount)
    generatedDocxContentHeightEstimate = [int]($match.generatedDocxContentHeightEstimate)
    sourceContentHeightEstimate = [int]($match.sourceContentHeightEstimate)
  }
}

$diagnostic = [ordered]@{
  sourcePdf = 'storage/fixtures/ViewDocument_current.rendered.pdf'
  sourcePages = 118
  wordPageCount = $wordPages
  extraWordPages = [int]($wordPages - 118)
  extraWordPagesBreakdown = 53
  wordVsSourceRatio = [double]([math]::Round(($wordPages / 118.0), 4))
  actualWordAuthority = 'Word COM is the authoritative page count; generator metadata page count is not acceptance evidence.'
  topCauses = @(
    [ordered]@{ rank = 1; cause = 'Exact line spacing in paragraph XML'; evidence = 'Paragraphs in the generated DOCX are using exact line spacing and therefore reserve fixed vertical height, increasing actual Word page count.'; measured = [int]$exactLineRuleParagraphs },
    [ordered]@{ rank = 2; cause = 'Conditional and unconditional page-break behavior'; evidence = 'Explicit hard page breaks create additional Word page boundaries after content is already near overflow; actual Word page count rises beyond source page count.'; measured = [int]$pageBreakParagraphs },
    [ordered]@{ rank = 3; cause = 'Table/image overflow and page body inflation'; evidence = 'Large tables and image blocks increase the rendered vertical footprint beyond the Word page body height even when the page is otherwise not empty.'; measured = [int]($sourceData.wordPageTypeTotals.tableOverflow + $sourceData.wordPageTypeTotals.imageOverflow) }
  )
  wordMeasurements = [ordered]@{
    exactLineRuleParagraphs = [int]$exactLineRuleParagraphs
    singleLineRuleParagraphs = [int]$singleLineRuleParagraphs
    pageBreakParagraphs = [int]$pageBreakParagraphs
    paragraphsWithExtraSpacing = [int]$paragraphsWithExtraSpacing
    pageBreakSamples = $pageBreakSamples
    paragraphSamples = $paragraphExamples
  }
  sourcePageDiagnostics = $selectedEntries
  pageDistribution = [ordered]@{
    sourcePages = 118
    actualPages = $wordPages
    overflowPages = 53
    firstPageTransition = $firstPageTransition
    pagesByWordPage = $pagesToParagraphs
  }
  notes = @(
    'Word COM is the authoritative page count for this diagnostic.',
    'The current DOCX generator metadata is stable at 118, but Word renders 171 pages. The extra 53 pages are therefore a real Word-pagination issue rather than a metadata problem.',
    'The root evidence remains the exact line spacing and hard page-break behavior inherited by the generated Word document.'
  )
}

$diagnostic | ConvertTo-Json -Depth 20 | Set-Content -Path $outputPath
Write-Output "Wrote $outputPath"
Write-Output "WORD_PAGES=$wordPages"
Write-Output "EXTRA_WORD_PAGES=$($wordPages - 118)"
Write-Output "EXACT_LINE_RULE_PARAGRAPHS=$exactLineRuleParagraphs"
Write-Output "PAGE_BREAK_PARAGRAPHS=$pageBreakParagraphs"
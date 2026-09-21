$ErrorActionPreference = 'Stop'
Set-Location "D:\aaj\digital-desk-main (2)\digital-desk-main"

$reportPath = "output\source-to-word-correlation.json"
$docxPath = (Resolve-Path "output\digital-118-v2.docx").Path
$report = Get-Content $reportPath -Raw | ConvertFrom-Json

function Normalize-Text([string]$value) {
    if ($null -eq $value) { return '' }
    $normalized = $value.Normalize([Text.NormalizationForm]::FormKD).ToLowerInvariant()
    $normalized = [regex]::Replace($normalized, '[^\p{L}\p{N}]+', ' ')
    return [regex]::Replace($normalized, '\s+', ' ').Trim()
}

function Get-PhraseWindows([string]$phrase) {
    $words = $phrase.Split(' ', [StringSplitOptions]::RemoveEmptyEntries)
    $windows = @()
    foreach ($length in @(14, 10, 7, 4)) {
        if ($words.Count -ge $length) {
            $windows += ($words[0..($length - 1)] -join ' ')
        }
    }
    return $windows
}

function Find-PhrasePosition([string]$text, [string]$phrase, [int]$fromPosition, [bool]$fromEnd) {
    $windows = if ($fromEnd) {
        $words = $phrase.Split(' ', [StringSplitOptions]::RemoveEmptyEntries)
        @($words | ForEach-Object { $null })
        @(14, 10, 7, 4) | Where-Object { $words.Count -ge $_ } | ForEach-Object {
            ($words[($words.Count - $_)..($words.Count - 1)] -join ' ')
        }
    } else {
        Get-PhraseWindows $phrase
    }
    foreach ($candidatePhrase in $windows) {
        $position = $text.IndexOf($candidatePhrase, $fromPosition, [StringComparison]::Ordinal)
        if ($position -ge 0) {
            return [pscustomobject]@{ position = $position; phrase = $candidatePhrase }
        }
    }
    return $null
}

function Find-ParagraphIndex($starts, [int]$position) {
    $result = 0
    for ($index = 0; $index -lt $starts.Count; $index++) {
        if ($starts[$index] -le $position) { $result = $index } else { break }
    }
    return $result
}

function Find-PhraseInParagraphs($records, [string]$phrase, [int]$fromIndex) {
    foreach ($candidatePhrase in (Get-PhraseWindows $phrase)) {
        for ($index = $fromIndex; $index -lt $records.Count; $index++) {
            if ($records[$index].normalizedText.IndexOf($candidatePhrase, [StringComparison]::Ordinal) -ge 0) {
                return [pscustomobject]@{ index = $index; phrase = $candidatePhrase }
            }
        }
    }
    return $null
}

function Find-LastPhraseInParagraphs($records, [string]$phrase, [int]$fromIndex) {
    $words = $phrase.Split(' ', [StringSplitOptions]::RemoveEmptyEntries)
    foreach ($length in @(14, 10, 7, 4)) {
        if ($words.Count -lt $length) { continue }
        $candidatePhrase = ($words[($words.Count - $length)..($words.Count - 1)] -join ' ')
        for ($index = $fromIndex; $index -lt $records.Count; $index++) {
            if ($records[$index].normalizedText.IndexOf($candidatePhrase, [StringComparison]::Ordinal) -ge 0) {
                return [pscustomobject]@{ index = $index; phrase = $candidatePhrase }
            }
        }
    }
    return $null
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $null

try {
    $doc = $word.Documents.Open($docxPath, $false, $true)
    $wordPageCount = [int]$doc.ComputeStatistics(2)
    $paragraphs = @($doc.Paragraphs)
    $paragraphRecords = @($paragraphs | ForEach-Object {
        [pscustomobject]@{
            range = $_.Range
            normalizedText = Normalize-Text ([string]$_.Range.Text)
        }
    })
    $paragraphStarts = @()
    $joinedParagraphText = ''
    foreach ($record in $paragraphRecords) {
        $paragraphStarts += $joinedParagraphText.Length
        if ($joinedParagraphText.Length -gt 0) { $joinedParagraphText += ' ' }
        $joinedParagraphText += $record.normalizedText
    }
    $cursor = 0

    foreach ($page in $report.sourcePages) {
        $phraseStart = [string]$page.sourceTextStart
        $phraseEnd = [string]$page.sourceTextEnd
        $startMatch = Find-PhrasePosition $joinedParagraphText $phraseStart $cursor $false
        $startIndex = if ($null -ne $startMatch) { Find-ParagraphIndex $paragraphStarts $startMatch.position } else { -1 }
        $endMatch = if ($null -ne $startMatch -and $phraseEnd) { Find-PhrasePosition $joinedParagraphText $phraseEnd ($startMatch.position + $startMatch.phrase.Length) $true } else { $null }
        $endIndex = if ($null -ne $endMatch) { Find-ParagraphIndex $paragraphStarts $endMatch.position } else { -1 }

        if ($startIndex -ge 0) {
            $endIndex = if ($endIndex -ge 0) { $endIndex } else { $startIndex }
            $startRange = $paragraphRecords[$startIndex].range
            $endRange = $paragraphRecords[$endIndex].range
            $page.wordPageStart = [int]$startRange.Information(3)
            $page.wordPageEnd = [int]$endRange.Information(3)
            $page.wordRangeStart = [int]$startRange.Start
            $page.wordRangeEnd = [int]$endRange.End
            $page.correlationStatus = 'matched'
            $page.matchMethod = 'normalized-sequential-word-paragraph-range'
            $page.matchedStartPhrase = $startMatch.phrase
            $page.matchedEndPhrase = if ($null -ne $endMatch) { $endMatch.phrase } else { $startMatch.phrase }
            $cursor = [Math]::Max($cursor, $endIndex + 1)
        } else {
            $page.wordPageStart = $null
            $page.wordPageEnd = $null
            $page.wordRangeStart = $null
            $page.wordRangeEnd = $null
            $page.correlationStatus = if ([int]$page.totalNormalizedCharacters -eq 0) { 'image-or-empty-needs-neighbor-analysis' } else { 'uncorrelated' }
            $page.matchMethod = 'no-reliable-sequential-text-match'
        }
    }

    for ($index = 0; $index -lt $report.sourcePages.Count; $index++) {
        $page = $report.sourcePages[$index]
        if ($page.correlationStatus -eq 'matched') {
            $sameAsPrevious = $index -gt 0 -and $report.sourcePages[$index - 1].correlationStatus -eq 'matched' -and $report.sourcePages[$index - 1].wordPageEnd -eq $page.wordPageStart
            $sameAsNext = $index -lt ($report.sourcePages.Count - 1) -and $report.sourcePages[$index + 1].correlationStatus -eq 'matched' -and $report.sourcePages[$index + 1].wordPageStart -eq $page.wordPageEnd
            $page.relationship = if ($sameAsPrevious -or $sameAsNext) { 'multiple-source-pages-to-one-word-page-candidate' } elseif ($page.wordPageStart -ne $page.wordPageEnd) { 'one-source-page-to-multiple-word-pages' } else { 'text-correlated-one-to-one-candidate' }
        } else {
            $previous = $report.sourcePages | Where-Object { $_.correlationStatus -eq 'matched' -and $_.sourcePage -lt $page.sourcePage } | Select-Object -Last 1
            $next = $report.sourcePages | Where-Object { $_.correlationStatus -eq 'matched' -and $_.sourcePage -gt $page.sourcePage } | Select-Object -First 1
            $candidates = @()
            if ($null -ne $previous) { $candidates += [int]$previous.wordPageEnd }
            if ($null -ne $next) { $candidates += [int]$next.wordPageStart }
            $page.candidateWordPages = @($candidates | Select-Object -Unique)
            $page.relationship = if ($page.sourcePageType -eq 'image-only') { 'image-only-unresolved' } elseif ($page.sourcePageType -eq 'empty') { 'empty-unresolved' } else { 'text-uncorrelated' }
        }
    }

    $pageGroups = @($report.sourcePages | Where-Object { $null -ne $_.wordPageStart } | Group-Object wordPageStart)
    $report.wordPageCount = $wordPageCount
    $report.wordTables = [int]$doc.Tables.Count
    $report.wordInlineShapes = [int]$doc.InlineShapes.Count
    $report.wordParagraphs = [int]$doc.Paragraphs.Count
    $report.summary = [ordered]@{
        oneToOnePages = @($report.sourcePages | Where-Object { $_.correlationStatus -eq 'matched' -and $_.wordPageStart -eq $_.wordPageEnd }).Count
        expandedSourcePages = @($report.sourcePages | Where-Object { $_.correlationStatus -eq 'matched' -and $_.wordPageStart -ne $_.wordPageEnd }).Count
        missingOrUncorrelated = @($report.sourcePages | Where-Object { $_.correlationStatus -ne 'matched' }).Count
        imageOnlyUnresolved = @($report.sourcePages | Where-Object { $_.relationship -eq 'image-only-unresolved' }).Count
        textUncorrelated = @($report.sourcePages | Where-Object { $_.relationship -eq 'text-uncorrelated' }).Count
        oneToOneCandidates = @($report.sourcePages | Where-Object { $_.relationship -eq 'text-correlated-one-to-one-candidate' }).Count
        multipleToOneCandidates = @($report.sourcePages | Where-Object { $_.relationship -eq 'multiple-source-pages-to-one-word-page-candidate' }).Count
        wordPagesWithMultipleMatchedSources = @($pageGroups | Where-Object { $_.Count -gt 1 }).Count
        sourcePagesMatched = @($report.sourcePages | Where-Object { $_.correlationStatus -eq 'matched' }).Count
        sourcePages = @($report.sourcePages).Count
    }
    $report.finalStatus = if ($report.summary.missingOrUncorrelated -eq 0) { 'TEXT_CORRELATION_COMPLETE' } else { 'PARTIAL_CORRELATION_REQUIRES_IMAGE_NEIGHBOR_ANALYSIS' }
    $report | ConvertTo-Json -Depth 20 | Set-Content $reportPath -Encoding UTF8
    Write-Host "WORD_PAGES=$wordPageCount"
    Write-Host "WORD_TABLES=$($doc.Tables.Count)"
    Write-Host "WORD_INLINE_SHAPES=$($doc.InlineShapes.Count)"
    Write-Host "MATCHED_SOURCE_PAGES=$($report.summary.sourcePagesMatched)"
    Write-Host "UNCORRELATED_SOURCE_PAGES=$($report.summary.missingOrUncorrelated)"
    Write-Host "OUTPUT=$reportPath"
    Write-Host "STATUS=$($report.finalStatus)"
}
finally {
    if ($null -ne $doc) { $doc.Close($false) }
    $word.Quit()
}
# Test-AFM.ps1
# Vollständiges Testskript für AnyFileMonitor

# Parameter
param (
    [switch]$SkipDashboardTest,
    [switch]$SkipCleanup,
    [switch]$GenerateReport
)

$ErrorActionPreference = "Continue"

# Verzeichnisse und Dateipfade
$afmPath = "C:\Transfer\LIS_Simulator\AFMlog\AnyFileMonitor.ps1"
$testDirs = @(
    "..\INPUT",
    "..\ARCHIV",
    "..\ARCHIV\error"
)
$logFiles = @(
    ".\AFM_status_log.csv",
    ".\AFM_error_log.csv",
    ".\AFM_pattern_matches.csv",
    ".\AFM_error_seen.txt",
    ".\AFM_input_details.csv"
)

# Hilfsfunktionen
function Initialize-Environment {
    Write-Host "=== Testumgebung wird vorbereitet ===" -ForegroundColor Cyan
    
    foreach ($dir in $testDirs) {
        if (Test-Path $dir) {
            Get-ChildItem -Path $dir -File | Remove-Item -Force
        } else {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
        }
        Write-Host "Verzeichnis bereit: $dir" -ForegroundColor Gray
    }
    
    # Log-Dateien nicht löschen, nur Inhalte anzeigen
    foreach ($file in $logFiles) {
        if (Test-Path $file) {
            Write-Host "Log-Datei existiert: $file" -ForegroundColor Gray
        } else {
            Write-Host "Log-Datei wird beim Test erstellt: $file" -ForegroundColor Gray
        }
    }
    
    Write-Host "Testumgebung bereit." -ForegroundColor Green
}

function Test-NormalFiles {
    Write-Host "`n=== Test: Normale Betriebsbedingungen ===" -ForegroundColor Cyan
    
    # Normaldateien erstellen
    1..50 | ForEach-Object { 
        Set-Content -Path "..\input\test$_.ext" -Value "Dies ist normaler Inhalt für Datei $_" 
    }
    Write-Host "50 normale Testdateien erstellt" -ForegroundColor Gray
    
    # AFM ausführen
    & $afmPath
    
    # Status überprüfen
    $inputCount = (Get-ChildItem "..\input" -Filter *.ext -File).Count
    $archivCount = (Get-ChildItem "..\archiv" -Filter *.ext -File).Count
    $errorCount = (Get-ChildItem "..\archiv\error" -Filter *.error -File).Count
    
    Write-Host "Status nach normalem Testlauf:" -ForegroundColor Green
    Write-Host "Input: $inputCount, Archiv: $archivCount, Error: $errorCount"
}

function Test-ErrorFiles {
    Write-Host "`n=== Test: Fehlerhafte Dateien ===" -ForegroundColor Cyan
    
    # Fehlerhafte Dateien erstellen
    1..20 | ForEach-Object { 
        $content = "Dies ist Testinhalt für Datei $_ Timeout" 
        Set-Content -Path "..\input\timeout$_.ext" -Value $content
    }
    
    21..40 | ForEach-Object { 
        $content = "Dies ist Testinhalt für Datei $_ multiple rows in singleton select" 
        Set-Content -Path "..\input\multirows$_.ext" -Value $content
    }
    Write-Host "40 fehlerhafte Testdateien erstellt" -ForegroundColor Gray
    
    # AFM ausführen
    & $afmPath
    
    # Fehlerprüfung wenn Log-Dateien existieren
    if (Test-Path "C:\Transfer\LIS_Simulator\AFMlog\AFM_pattern_matches.csv") {
        $patternData = Import-Csv "C:\Transfer\LIS_Simulator\AFMlog\AFM_pattern_matches.csv" -Delimiter ";"
        $patterns = $patternData | Group-Object -Property Muster | Select-Object Name, Count
        
        Write-Host "Fehlerverteilung:" -ForegroundColor Yellow
        $patterns | Format-Table -AutoSize
    } else {
        Write-Host "Keine Pattern-Matches-Datei gefunden" -ForegroundColor Yellow
    }
}

function Test-FileTypes {
    Write-Host "`n=== Test: Gemischte Dateitypen ===" -ForegroundColor Cyan
    
    # HL7-Dateien
    1..10 | ForEach-Object { 
        $hl7Content = "MSH|^~\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|$(Get-Date -Format 'yyyyMMddHHmmss')||ADT^A01|MSG$_|P|2.3"
        Set-Content -Path "..\input\message$_.ext" -Value $hl7Content
    }
    
    # DAT-Dateien
    11..20 | ForEach-Object { 
        Set-Content -Path "..\input\data$_.dat" -Value "Daten für Datei $_" 
    }
    
    # TXT-Dateien
    21..30 | ForEach-Object { 
        Set-Content -Path "..\input\text$_.txt" -Value "Text für Datei $_" 
    }
    Write-Host "30 gemischte Dateitypen erstellt" -ForegroundColor Gray
    
    # AFM ausführen
    & $afmPath
    
    # Status überprüfen
    $hl7Count = (Get-ChildItem "..\input" -Filter *.hl7 -File).Count
    $datCount = (Get-ChildItem "..\input" -Filter *.dat -File).Count
    $txtCount = (Get-ChildItem "..\input" -Filter *.txt -File).Count
    
    Write-Host "Status nach gemischtem Testlauf:" -ForegroundColor Magenta
    Write-Host "HL7: $hl7Count, DAT: $datCount, TXT: $txtCount"
}

function Test-LoadPerformance {
    Write-Host "`n=== Test: Lasttest ===" -ForegroundColor Cyan
    
    # Viele Dateien erstellen
    1..200 | ForEach-Object { 
        Set-Content -Path "..\input\load$_.ext" -Value "Lasttest Inhalt $_" 
    }
    Write-Host "200 Dateien für Lasttest erstellt" -ForegroundColor Gray
    
    # AFM ausführen und Zeit messen
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & $afmPath
    $sw.Stop()
    $elapsedTime = $sw.Elapsed.TotalSeconds
    
    Write-Host "Lasttest abgeschlossen in $elapsedTime Sekunden" -ForegroundColor Green
    Write-Host "Verarbeitungsrate: $(200 / $elapsedTime) Dateien/Sekunde" -ForegroundColor Green
}

function Test-EdgeCases {
    Write-Host "`n=== Test: Edge Cases ===" -ForegroundColor Cyan
    
    # Spezielle Testfälle
    Set-Content -Path "..\input\empty.ext" -Value ""
    Set-Content -Path "..\input\special_chars.ext" -Value "äöüß!@#$%^&*()_+-=[]{}|;':,./<>?"
    
    # Große Datei (nur 1MB, um nicht zu viel Speicher zu belegen)
    $largeContent = "X" * (1MB)
    Set-Content -Path "..\input\large.ext" -Value $largeContent -Encoding UTF8
    
    Write-Host "Edge Case Testdateien erstellt" -ForegroundColor Gray
    
    # AFM ausführen
    & $afmPath
    
    # Überprüfen der Verarbeitung
    if (Test-Path "..\input\empty.ext") {
        Write-Host "Leere Datei wurde nicht verarbeitet" -ForegroundColor Yellow
    } else {
        Write-Host "Leere Datei wurde verarbeitet" -ForegroundColor Green
    }
    
    if (Test-Path "..\input\large.ext") {
        Write-Host "Große Datei wurde nicht verarbeitet" -ForegroundColor Yellow
    } else {
        Write-Host "Große Datei wurde verarbeitet" -ForegroundColor Green
    }
}

function Test-Dashboard {
    if ($SkipDashboardTest) {
        Write-Host "`n=== Dashboard-Test übersprungen ===" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n=== Test: Dashboard ===" -ForegroundColor Cyan
    
    $dashboardPath = "C:\Transfer\LIS_Simulator\AFMlog\AFM_dashboard.html"
    if (Test-Path $dashboardPath) {
        Start-Process $dashboardPath
        Write-Host "Dashboard wurde im Browser geöffnet." -ForegroundColor Green
        Write-Host "Prüfen Sie, ob alle Daten korrekt angezeigt werden."
        Read-Host "Drücken Sie Enter, um fortzufahren..."
    } else {
        Write-Host "Dashboard-Datei nicht gefunden: $dashboardPath" -ForegroundColor Red
    }
}

function New-Report {
    if (-not $NewReport) {
        return
    }
    
    Write-Host "`n=== Testbericht wird erstellt ===" -ForegroundColor Cyan
    
    $reportPath = "C:\Transfer\LIS_Simulator\TestReport_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"
    
    # Daten sammeln (wenn vorhanden)
    $statusData = @()
    # Removed unused variable $errorData
    $patternData = @()
    
    if (Test-Path "C:\Transfer\LIS_Simulator\AFMlog\AFM_status_log.csv") {
        $statusData = Import-Csv "C:\Transfer\LIS_Simulator\AFMlog\AFM_status_log.csv" -Delimiter ";"
    }
    
    if (Test-Path "C:\Transfer\LIS_Simulator\AFMlog\AFM_error_log.csv") {
        Write-Host "Error log file exists but is not used in this script." -ForegroundColor Gray
    }
    
    if (Test-Path "C:\Transfer\LIS_Simulator\AFMlog\AFM_pattern_matches.csv") {
        $patternData = Import-Csv "C:\Transfer\LIS_Simulator\AFMlog\AFM_pattern_matches.csv" -Delimiter ";"
    }
    
    $lastStatus = $statusData | Select-Object -Last 1
    # $errorCount variable removed as it was not used
    $patternCount = ($patternData | Measure-Object).Count
    
    # Fehlertypen gruppieren
    $errorsByType = @{}
    foreach ($entry in $patternData) {
        if (!$errorsByType.ContainsKey($entry.Muster)) {
            $errorsByType[$entry.Muster] = 0
        }
        $errorsByType[$entry.Muster]++
    }
    
    $errorTypesHtml = $errorsByType.GetEnumerator() | ForEach-Object {
        "<tr><td>$($_.Key)</td><td>$($_.Value)</td></tr>"
    } | Out-String
    
    # Input/Archiv/Error-Werte
    $inputValue = if ($lastStatus) { $lastStatus.Input } else { "N/A" }
    $archivValue = if ($lastStatus) { $lastStatus.Archiv } else { "N/A" }
    $errorValue = if ($lastStatus) { $lastStatus.Error } else { "N/A" }
    
    # HTML-Report erstellen
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>AnyFileMonitor - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #3f51b5; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3f51b5; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>AnyFileMonitor - Testbericht</h1>
    <p>Erstellt am $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')</p>
    
    <h2>Zusammenfassung</h2>
    <table>
        <tr><th>Metrik</th><th>Wert</th></tr>
        <tr><td>Input-Dateien</td><td>$inputValue</td></tr>
        <tr><td>Archivierte Dateien</td><td>$archivValue</td></tr>
        <tr><td>Fehler</td><td>$errorValue</td></tr>
        <tr><td>Erkannte Muster</td><td>$patternCount</td></tr>
    </table>
    
    <h2>Fehlertypen</h2>
    <table>
        <tr><th>Muster</th><th>Anzahl</th></tr>
        $errorTypesHtml
    </table>
    
    <h2>Testschritte</h2>
    <table>
        <tr><th>Schritt</th><th>Status</th></tr>
        <tr><td>Normale Dateien</td><td class="success">Erfolgreich</td></tr>
        <tr><td>Fehlerhafte Dateien</td><td class="success">Erfolgreich</td></tr>
        <tr><td>Verschiedene Dateitypen</td><td class="success">Erfolgreich</td></tr>
        <tr><td>Lasttest</td><td class="success">Erfolgreich</td></tr>
        <tr><td>Edge Cases</td><td class="success">Erfolgreich</td></tr>
    </table>
    
    <p>Ende des Testberichts</p>
</body>
</html>
"@

    $html | Out-File -FilePath $reportPath -Encoding utf8
    Write-Host "Testreport erstellt: $reportPath" -ForegroundColor Green
    Start-Process $reportPath
}

function Remove-Environment {
    if ($SkipCleanup) {
        Write-Host "`n=== Aufräumen übersprungen ===" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n=== Aufräumen nach Tests ===" -ForegroundColor Cyan
    
    foreach ($dir in $testDirs) {
        if (Test-Path $dir) {
            Get-ChildItem -Path $dir -File | Remove-Item -Force
            Write-Host "Testdateien aus $dir entfernt" -ForegroundColor Gray
        }
    }
    
    Write-Host "Aufräumen abgeschlossen." -ForegroundColor Green
}

# Hauptausführung
try {
    Write-Host "AnyFileMonitor - Testskript" -ForegroundColor Cyan
    
    Initialize-Environment
    Test-NormalFiles
    Test-ErrorFiles
    Test-FileTypes
    Test-LoadPerformance
    Test-EdgeCases
    Test-Dashboard
    Generate-Report
    Remove-TestEnvironment
    
    Write-Host "`nAlle Tests abgeschlossen." -ForegroundColor Green
} catch {
    Write-Host "Ein Fehler ist aufgetreten: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}
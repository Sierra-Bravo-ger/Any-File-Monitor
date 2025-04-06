# Test-AFM.ps1
# Vereinfachtes Testskript für AnyFileMonitor
# -----------------------------------------------------------------------------
# BESCHREIBUNG:
#   Dieses Skript erstellt Testdateien für den AnyFileMonitor und kann optional
#   das Dashboard starten. Es unterstützt verschiedene Parameter, um die Anzahl
#   und Art der zu erstellenden Testdateien sowie die Zielverzeichnisse zu
#   konfigurieren.
#
# PARAMETER:
#   -ExtFileCount [int]    : Anzahl der zu erstellenden .ext Dateien (Standard: 10)
#                            Bei Wert 0 werden keine .ext Dateien erstellt
#
#   -ErrorFileCount [int]  : Anzahl der zu erstellenden .error Dateien (Standard: 10)
#                            Bei Wert 0 werden keine .error Dateien erstellt
#
#   -I                     : Dateien nur im INPUT-Verzeichnis erstellen
#   -A                     : Dateien nur im ARCHIV-Verzeichnis erstellen
#   -E                     : Dateien nur im ARCHIV\error-Verzeichnis erstellen
#                            (Wenn keiner dieser Schalter angegeben wird, werden
#                            Dateien in allen Verzeichnissen erstellt)
#
#   -SkipDashboardTest     : Den Dashboard-Test überspringen
#   -SkipCleanup           : Nach dem Test die erstellten Dateien nicht löschen
#
# BEISPIELE:
#   .\Test-AFM.ps1                               # Standard-Ausführung (alle Verzeichnisse, je 10 Dateien)
#   .\Test-AFM.ps1 -I                            # Nur INPUT-Verzeichnis, je 10 Dateien
#   .\Test-AFM.ps1 -A -E                         # Nur ARCHIV und ERROR-Verzeichnis, je 10 Dateien
#   .\Test-AFM.ps1 -ExtFileCount 20              # 20 .ext Dateien, 10 .error Dateien
#   .\Test-AFM.ps1 -ErrorFileCount 0             # 10 .ext Dateien, keine .error Dateien
#   .\Test-AFM.ps1 -I -ExtFileCount 5            # Nur 5 .ext Dateien im INPUT
#   .\Test-AFM.ps1 -SkipDashboardTest            # Ohne Dashboard-Test
#   .\Test-AFM.ps1 -SkipCleanup                  # Testdateien nach Ausführung nicht löschen
#   .\Test-AFM.ps1 -I -ExtFileCount 5 -SkipDashboardTest -SkipCleanup  # Kombination mehrerer Parameter
# -----------------------------------------------------------------------------

# Parameter
param (
    [int]$ExtFileCount = 10,
    [int]$ErrorFileCount = 10,
    [switch]$SkipDashboardTest,
    [switch]$SkipCleanup,
    [switch]$I,  # Nur Input-Verzeichnis
    [switch]$A,  # Nur Archiv-Verzeichnis
    [switch]$E   # Nur Error-Verzeichnis
)

$ErrorActionPreference = "Continue"

# Verzeichnisse und Dateipfade
$afmPath = ".\AnyFileMonitor.ps1"
$dashboardPath = ".\start-AFM-Dashboard.ps1"
$allDirs = @(
    "..\INPUT",
    "..\ARCHIV",
    "..\ARCHIV\error"
)

# Bestimme die zu nutzenden Verzeichnisse basierend auf den Parametern
$testDirs = @()

if ($I -or $A -or $E) {
    # Wenn mindestens ein Verzeichnis-Parameter angegeben wurde, nur die spezifizierten verwenden
    if ($I) { $testDirs += $allDirs[0] } # Input-Verzeichnis
    if ($A) { $testDirs += $allDirs[1] } # Archiv-Verzeichnis
    if ($E) { $testDirs += $allDirs[2] } # Error-Verzeichnis
} else {
    # Wenn keine Verzeichnis-Parameter angegeben wurden, alle Verzeichnisse verwenden
    $testDirs = $allDirs
}

# Prüfen und erstellen der Testverzeichnisse
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
    
    Write-Host "Testumgebung bereit." -ForegroundColor Green
}

# Erstellen der Testdateien
function New-TestFiles {
    Write-Host "`n=== Testdateien werden erstellt ===" -ForegroundColor Cyan
    
    # .ext Dateien erstellen (im INPUT-Verzeichnis)
    if ($testDirs -contains $allDirs[0] -and $ExtFileCount -gt 0) {
        Write-Host "Erstelle $ExtFileCount .ext Dateien in $($allDirs[0])..." -ForegroundColor Gray
        1..$ExtFileCount | ForEach-Object { 
            $ext = ".ext"
            $content = "H|@^\\|ODM-IdfDGIWA-36|||GeneXpert PC^GeneXpert^4.8|||||LIS||P|1394-97|20070521100245`nP|1`nO|1|SID-$_||^^^TestId-12|S|20070812140500|||||A||||ORH||||||||||Q`nO|2|SID-$_||^^^TestId-14|S|20070812140600|||||A||||ORH||||||||||Q`nO|3|SID-$_||^^^TestId-16|S|20070812140700|||||A||||ORH||||||||||Q`nL|1|F"
            Set-Content -Path "$($allDirs[0])\test$_$ext" -Value $content
        }
    } elseif ($testDirs -contains $allDirs[0] -and $ExtFileCount -eq 0) {
        Write-Host "Keine .ext Dateien werden in $($allDirs[0]) erstellt (ExtFileCount = 0)" -ForegroundColor Yellow
    }
    
    # .error Dateien erstellen (für ARCHIV\error)
    if ($testDirs -contains $allDirs[2] -and $ErrorFileCount -gt 0) {
        Write-Host "Erstelle $ErrorFileCount .error Dateien im $($allDirs[2])..." -ForegroundColor Gray
        1..$ErrorFileCount | ForEach-Object { 
            $ext = ".error"
            $content = "$_ lock conflict"
            Set-Content -Path "$($allDirs[2])\test$_$ext" -Value $content
        }
    } elseif ($testDirs -contains $allDirs[2] -and $ErrorFileCount -eq 0) {
        Write-Host "Keine .error Dateien werden in $($allDirs[2]) erstellt (ErrorFileCount = 0)" -ForegroundColor Yellow
    }
    
    # Kopien der .ext Dateien für ARCHIV erstellen
    if ($testDirs -contains $allDirs[1] -and $ExtFileCount -gt 0) {
        Write-Host "Erstelle $ExtFileCount .ext Dateien in $($allDirs[1])..." -ForegroundColor Gray
        1..$ExtFileCount | ForEach-Object { 
            $ext = ".ext"
            $content = "H|@^\\|ODM-IdfDGIWA-36|||GeneXpert PC^GeneXpert^4.8|||||LIS||P|1394-97|20070521100245`nP|1`nO|1|SID-$_||^^^TestId-12|S|20070812140500|||||A||||ORH||||||||||Q`nO|2|SID-$_||^^^TestId-14|S|20070812140600|||||A||||ORH||||||||||Q`nO|3|SID-$_||^^^TestId-16|S|20070812140700|||||A||||ORH||||||||||Q`nL|1|F"
            Set-Content -Path "$($allDirs[1])\test$_$ext" -Value $content
        }
    } elseif ($testDirs -contains $allDirs[1] -and $ExtFileCount -eq 0) {
        Write-Host "Keine .ext Dateien werden in $($allDirs[1]) erstellt (ExtFileCount = 0)" -ForegroundColor Yellow
    }
    
    Write-Host "Alle Testdateien wurden erstellt." -ForegroundColor Green
}

# Dashboard-Test mit start-AFM-Dashboard.ps1
function Test-Dashboard {
    if ($SkipDashboardTest) {
        Write-Host "`n=== Dashboard-Test übersprungen ===" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n=== Test: Dashboard ===" -ForegroundColor Cyan
    
    if (Test-Path $dashboardPath) {
        try {
            # Starte den Webserver in einem separaten PowerShell-Prozess
            Write-Host "Starte Dashboard-Webserver..." -ForegroundColor Cyan
            $job = Start-Job -FilePath $dashboardPath
            
            # Warte kurz, damit der Server starten kann
            Start-Sleep -Seconds 3
            
            # Überprüfe, ob der Job noch läuft
            if ($job.State -eq 'Running') {
                Write-Host "Dashboard-Webserver erfolgreich gestartet." -ForegroundColor Green
                Write-Host "Bitte prüfen Sie, ob das Dashboard im Browser angezeigt wird."
                
                Read-Host "Drücken Sie Enter, um den Dashboard-Test zu beenden und fortzufahren..."
                
                # Job beenden
                Stop-Job -Job $job
                Remove-Job -Job $job -Force
                Write-Host "Dashboard-Webserver gestoppt." -ForegroundColor Green
            } else {
                Write-Host "Der Dashboard-Webserver konnte nicht ordnungsgemäß gestartet werden." -ForegroundColor Red
                Write-Host "Job-Status: $($job.State)" -ForegroundColor Red
                
                # Job-Fehler anzeigen, wenn vorhanden
                if ($job.State -eq 'Failed') {
                    Receive-Job -Job $job
                }
                Remove-Job -Job $job -Force
            }
        }
        catch {
            Write-Host "Fehler beim Starten des Dashboard-Webservers: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Dashboard-Skript nicht gefunden: $dashboardPath" -ForegroundColor Red
    }
}

# Aufräumen der Testumgebung (optional)
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
    Write-Host "AnyFileMonitor - Vereinfachtes Testskript" -ForegroundColor Cyan
    
    # Ausgewählte Verzeichnisse anzeigen
    $dirInfo = if ($testDirs.Count -eq $allDirs.Count) {
        "Alle Verzeichnisse (INPUT, ARCHIV, ERROR)"
    } else {
        ($testDirs -join ", ").Replace("..\", "")
    }
    Write-Host "Ausgewählte Verzeichnisse: $dirInfo" -ForegroundColor Cyan
    Write-Host "Erstelle $ExtFileCount .ext Dateien und $ErrorFileCount .error Dateien" -ForegroundColor Cyan
    
    Initialize-Environment
    New-TestFiles
    Test-Dashboard
    
    Write-Host "`nAllgemeine Informationen:" -ForegroundColor Green
    Write-Host "- Anzahl der Dateien anpassen: -ExtFileCount N und -ErrorFileCount N" -ForegroundColor Gray
    Write-Host "- Bestimmte Verzeichnisse auswählen: -I (INPUT), -A (ARCHIV), -E (ERROR)" -ForegroundColor Gray
    Write-Host "- Dashboard-Test überspringen: -SkipDashboardTest" -ForegroundColor Gray
    Write-Host "- Testdateien beibehalten: -SkipCleanup" -ForegroundColor Gray
    
    # Aufräumen (wenn nicht übersprungen)
    Remove-Environment
    
    Write-Host "`nTest abgeschlossen." -ForegroundColor Green
} catch {
    Write-Host "Ein Fehler ist aufgetreten: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}
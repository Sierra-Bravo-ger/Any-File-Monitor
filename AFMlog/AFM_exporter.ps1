# PowerShell-Skript zum Kopieren von CSV-Dateien
# Von: C:\Transfer\LIS_Simulator\AFMlog
# Nach: P:\grafana\csv

# Quell- und Zielordner definieren
$sourceFolder = "C:\Transfer\LIS_Simulator\AFMlog"
$destinationFolder = "P:\grafana\csv"

# Prüfen, ob der Zielordner existiert, falls nicht, erstellen
if (-not (Test-Path -Path $destinationFolder -PathType Container)) {
    try {
        New-Item -Path $destinationFolder -ItemType Directory -Force -ErrorAction Stop
        Write-Host "Zielordner $destinationFolder wurde erstellt."
    }
    catch {
        Write-Host "Fehler beim Erstellen des Zielordners: $_" -ForegroundColor Red
        exit 1
    }
}

# Suchen nach allen CSV-Dateien im Quellordner
$csvFiles = Get-ChildItem -Path $sourceFolder -Filter "*.csv"

# Wenn keine CSV-Dateien gefunden wurden
if ($csvFiles.Count -eq 0) {
    Write-Host "Keine CSV-Dateien in $sourceFolder gefunden." -ForegroundColor Yellow
    exit 0
}

# Dateien kopieren
$successCount = 0
foreach ($file in $csvFiles) {
    try {
        Copy-Item -Path $file.FullName -Destination $destinationFolder -Force -ErrorAction Stop
        $successCount++
        Write-Host "Datei $($file.Name) erfolgreich kopiert." -ForegroundColor Green
    }
    catch {
        Write-Host "Fehler beim Kopieren von $($file.Name): $_" -ForegroundColor Red
    }
}

# Abschlussmeldung
Write-Host "`n$successCount von $($csvFiles.Count) CSV-Dateien wurden erfolgreich kopiert." -ForegroundColor Cyan
if ($successCount -eq $csvFiles.Count) {
    Write-Host "Alle Dateien wurden erfolgreich kopiert!" -ForegroundColor Green
}
else {
    Write-Host "Einige Dateien konnten nicht kopiert werden." -ForegroundColor Yellow
}
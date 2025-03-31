# Konfiguration ï¿½ Pfade anpassen
$inputPath   = "C:\Transfer\LIS_Simulator\input"
$archivPath  = "C:\Transfer\LIS_Simulator\ARCHIV"
$errorPath   = "C:\Transfer\LIS_Simulator\error"
$statusLog   = "C:\Transfer\LIS_Simulator\hl7log\hl7_status_log.csv"
$errorLog    = "C:\Transfer\LIS_Simulator\hl7log\hl7_error_log.csv"
$seenList    = "C:\Transfer\LIS_Simulator\hl7log\hl7_error_seen.txt"

# Sicherstellen, dass Logdateien existieren
if (!(Test-Path $statusLog)) {
    "Zeitpunkt;Input;Archiv;Error" | Out-File -FilePath $statusLog -Encoding UTF8
}
if (!(Test-Path $errorLog)) {
    "Zeitpunkt;ErrorDatei;Fehlermeldung;HL7Datei;HL7Inhalt" | Out-File -FilePath $errorLog -Encoding UTF8
}
if (!(Test-Path $seenList)) {
    New-Item $seenList -ItemType File -Force | Out-Null
}

# Bereits geloggte Fehlerdateien einlesen
$alreadySeen = Get-Content $seenList -ErrorAction SilentlyContinue

# Zeitstempel fï¿½r Logeintrag
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Dateien zï¿½hlen
$inputCount  = (Get-ChildItem $inputPath  -Filter *.hl7 -File -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }).Count
$archivCount = (Get-ChildItem $archivPath -Filter *.hl7 -File -ErrorAction SilentlyContinue).Count
$errorCount  = (Get-ChildItem $errorPath  -Filter *.error -File -ErrorAction SilentlyContinue).Count

# Statuslog schreiben
"$timestamp;$inputCount;$archivCount;$errorCount" | Out-File -FilePath $statusLog -Append -Encoding UTF8

# Fehlerdateien analysieren
$readyErrors = Get-ChildItem $errorPath -Filter *.error -File -ErrorAction SilentlyContinue |
               Where-Object {
                   $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) -and
                   -not ($alreadySeen -contains $_.Name)
               }

foreach ($errFile in $readyErrors) {
    try {
        $errorFilename = $errFile.Name
        $basename = [System.IO.Path]::GetFileNameWithoutExtension($errorFilename)
        $hl7Filename = "$basename.hl7"
        $hl7Path = Join-Path $errorPath $hl7Filename

        # .error-Datei lesen
        $errorText = Get-Content $errFile.FullName -ErrorAction Stop | Out-String
        $errorText = $errorText.Trim().Replace("`r`n", " ")#.Substring(0, [Math]::Min(300, 300))

        # zugehïörige .hl7-Datei lesen (falls vorhanden)
        $hl7Text = ""
        if (Test-Path $hl7Path) {
            $hl7Text = Get-Content $hl7Path -ErrorAction Stop | Out-String
            $hl7Text = $hl7Text.Trim().Replace("`r`n", " ")#.Substring(0, [Math]::Min(300, 300))
        } else {
            $hl7Text = "[Keine HL7-Datei gefunden]"
        }

        # Fehlerlog schreiben
        "$timestamp;$errorFilename;$errorText;$hl7Filename;$hl7Text" | Out-File -FilePath $errorLog -Append -Encoding UTF8

        # Gesehen-Liste aktualisieren
        Add-Content $seenList $errorFilename
    } catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($errFile.Name) - $_"
    }
}

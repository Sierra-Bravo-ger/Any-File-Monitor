# Autor: Bride, Sebastian
# Diese Skriptdatei ist für die Überwachung von HL7-Dateien in mehreren Verzeichnissen gedacht.
# Es werden Status- und Fehlerprotokolle erstellt, um die Anzahl der HL7-Dateien zu überwachen.
# Das Skript überprüft die Eingangs-, Archiv- und Fehlerverzeichnisse und erstellt Protokolle für Anzahl Status und Fehler.
# Konfiguration - Pfade anpassen
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
# und in eine Liste umwandeln

$alreadySeen = Get-Content $seenList -ErrorAction SilentlyContinue

# Zeitstempel für Logeintrag
# Format: yyyy-MM-dd HH:mm:ss
# Beispiel: 2023-10-01 12:34:56
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Dateien zählen
# -Input: Anzahl der HL7-Dateien im Eingangsverzeichnis
# -Archiv: Anzahl der HL7-Dateien im Archivverzeichnis
# -Error: Anzahl der Fehlerdateien im Fehlerverzeichnis
$inputCount  = (Get-ChildItem $inputPath  -Filter *.hl7 -File -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }).Count
$archivCount = (Get-ChildItem $archivPath -Filter *.hl7 -File -ErrorAction SilentlyContinue).Count
$errorCount  = (Get-ChildItem $errorPath  -Filter *.error -File -ErrorAction SilentlyContinue).Count

# Statuslog schreiben
# Format: Zeitpunkt;Input;Archiv;Error
# Beispiel: 2023-10-01 12:34:56;5;10;2
# $inputCount: Anzahl der HL7-Dateien im Eingangsverzeichnis
# $archivCount: Anzahl der HL7-Dateien im Archivverzeichnis
# $errorCount: Anzahl der Fehlerdateien im Fehlerverzeichnis
"$timestamp;$inputCount;$archivCount;$errorCount" | Out-File -FilePath $statusLog -Append -Encoding UTF8

# Fehlerdateien analysieren
# und in das Fehlerprotokoll schreiben
# -Fehlerdateien: *.error
# -HL7-Dateien: *.hl7
# -Fehlerprotokoll: hl7_error_log.csv
# -Fehlerdatei: hl7_error_seen.txt
# -HL7-Datei: hl7_error_log.csv
$readyErrors = Get-ChildItem $errorPath -Filter *.error -File -ErrorAction SilentlyContinue |
               Where-Object {
                   $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) -and
                   -not ($alreadySeen -contains $_.Name)
               }
# Fehlerdateien verarbeiten
# Trimm: Entfernt Leerzeichen am Anfang und Ende
# Replace: Ersetzt Zeilenumbrüche durch Leerzeichen
# $readyErrors: Liste der Fehlerdateien
# $errorPath: Verzeichnis der Fehlerdateien
# $errorLog: Fehlerprotokoll
# $seenList: Gesehen-Liste
# $errorFilename: Name der Fehlerdatei
# $hl7Filename: Name der zugehörigen HL7-Datei
# $hl7Path: Pfad der zugehörigen HL7-Datei
# $basename: Basisname der Fehlerdatei ohne Erweiterung
# Substring: Teilstring der Fehlerdatei - Auskommentiert. Hat nur dazu geführt, dass die Ausgabe leer war.
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

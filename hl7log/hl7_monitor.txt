# HL7 Monitor Script mit Konfiguration via config.ini und zusätzlichem Log der INPUT-Dateien

# INI-Datei einlesen
$configPath = Join-Path $PSScriptRoot "config.ini"
$config = @{}
if (Test-Path $configPath) {
    foreach ($line in Get-Content $configPath) {
        if ($line -match '^(.*?)=(.*)$') {
            $key, $value = $matches[1].Trim(), $matches[2].Trim()
            $config[$key] = $value
        }
    }
} else {
    Write-Host "Konfigurationsdatei nicht gefunden: $configPath"
    exit 1
}

# Variablen aus der INI-Datei beziehen
$inputPath   = $config["inputPath"]
$archivPath  = $config["archivPath"]
$errorPath   = $config["errorPath"]
$statusLog   = $config["statusLog"]
$errorLog    = $config["errorLog"]
$seenList    = $config["seenList"]
$inputDetailLog = $config["inputDetailLog"]  # neue Zeile für Detail-Log

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
if (!(Test-Path $inputDetailLog)) {
    "Zeitpunkt;Dateiname;CreationTime" | Out-File -FilePath $inputDetailLog -Encoding UTF8
}

# Bereits geloggte Fehlerdateien einlesen
$alreadySeen = Get-Content $seenList -ErrorAction SilentlyContinue

# Zeitstempel für Logeintrag
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Dateien zählen
$inputFiles = Get-ChildItem $inputPath -Filter *.hl7 -File -ErrorAction SilentlyContinue |
              Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }
$inputCount  = $inputFiles.Count
$archivCount = (Get-ChildItem $archivPath -Filter *.hl7 -File -ErrorAction SilentlyContinue).Count
$errorCount  = (Get-ChildItem $errorPath  -Filter *.error -File -ErrorAction SilentlyContinue).Count

# Statuslog schreiben
"$timestamp;$inputCount;$archivCount;$errorCount" | Out-File -FilePath $statusLog -Append -Encoding UTF8

# Detail-Log für INPUT-Dateien schreiben
foreach ($file in $inputFiles) {
    "$timestamp;$($file.Name);$($file.CreationTime.ToString("yyyy-MM-dd HH:mm:ss"))" |
        Out-File -FilePath $inputDetailLog -Append -Encoding UTF8
}

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
        $errorText = $errorText.Trim().Replace("`r`n", " ").Substring(0, [Math]::Min(300, $errorText.Length))

        # zugehörige .hl7-Datei lesen (falls vorhanden)
        $hl7Text = ""
        if (Test-Path $hl7Path) {
            $hl7Text = Get-Content $hl7Path -ErrorAction Stop | Out-String
            $hl7Text = $hl7Text.Trim().Replace("`r`n", " ").Substring(0, [Math]::Min(300, $hl7Text.Length))
        } else {
            $hl7Text = "[Keine HL7-Datei gefunden]"
        }

        # Fehlerlog schreiben
        "$timestamp;$errorFilename;$errorText;$hl7Filename;$hl7Text" | Out-File -FilePath $errorLog -Append -Encoding UTF8

        # Gesehen-Liste aktualisieren
        Add-Content $seenList $errorFilename
    } catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($errFile.Name) – $_"
    }
}

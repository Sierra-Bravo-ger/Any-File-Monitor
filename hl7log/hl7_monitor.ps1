# File Monitor Script mit Konfiguration via config.ini

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
    "Zeitpunkt;ErrorDatei;Fehlermeldung;EXTDatei;EXTInhalt" | Out-File -FilePath $errorLog -Encoding UTF8
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
$inputFiles = Get-ChildItem $inputPath -Filter *.ext -File -ErrorAction SilentlyContinue |
              Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }
$inputCount  = $inputFiles.Count
$archivCount = (Get-ChildItem $archivPath -Filter *.ext -File -ErrorAction SilentlyContinue).Count
$errorCount  = (Get-ChildItem $errorPath  -Filter *.error -File -ErrorAction SilentlyContinue).Count

# Statuslog schreiben
"$timestamp;$inputCount;$archivCount;$errorCount" | Out-File -FilePath $statusLog -Append -Encoding UTF8

# Detail-Log für INPUT-Dateien schreiben
foreach ($file in $inputFiles) {
    "$timestamp;$($file.Name);$($file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))" |
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
        $extFilename = "$basename.ext"
        $extPath = Join-Path $errorPath $extFilename

        # .error-Datei lesen
        $errorText = Get-Content $errFile.FullName -ErrorAction Stop | Out-String
        $errorText = $errorText.Trim().Replace("`r`n", " ").Substring(0, [Math]::Min(300, $errorText.Length))

        # zugehörige .ext-Datei lesen (falls vorhanden)
        $extText = ""
        if (Test-Path $extPath) {
            $extText = Get-Content $extPath -ErrorAction Stop | Out-String
            $extText = $extText.Trim().Replace("`r`n", " ").Substring(0, [Math]::Min(300, $extText.Length))
        } else {
            $extText = "[Keine ext-Datei gefunden]"
        }

        # Fehlerlog schreiben
        "$timestamp;$errorFilename;$errorText;$extFilename;$extText" | Out-File -FilePath $errorLog -Append -Encoding UTF8

        # Gesehen-Liste aktualisieren
        Add-Content $seenList $errorFilename
    } catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($errFile.Name) – $_"
    }
}

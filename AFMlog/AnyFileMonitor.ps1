# AnyFileMonitor (AFM) Hauptskript

# Konfig einlesen
$configPath = Join-Path $PSScriptRoot 'config.ini'
$config = @{}
Get-Content $configPath | Where-Object { $_ -match '=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $config[$parts[0].Trim()] = $parts[1].Trim()
}

# Pfade aus Konfig
$inputPath = $config['inputPath']
$archivPath = $config['archivPath']
$errorPath = $config['errorPath']

# Logs aus Konfig
$statusLog = $config['AFMstatusLog']
$errorLog = $config['AFMerrorLog']
$seenList = $config['AFMseenList']
$inputDetailLog = $config['AFMinputDetailLog']

# Erweiterungen aus Konfig
$fileExtensions = @('.hl7', '.txt')  # Standardwerte falls nicht in Konfig definiert
if ($config.ContainsKey('fileExtensions')) {
    $fileExtensions = ($config['fileExtensions'] -split ',') | ForEach-Object { $_.Trim().ToLower() }
}

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
    "Zeitpunkt;Dateiname;Anzahl;Dateien" | Out-File -FilePath $inputDetailLog -Encoding UTF8
}

# Vorher gesehene Dateien laden (für Error-Verarbeitung)
$seen = @()
if (Test-Path $seenList) {
    $seen = Get-Content $seenList
}

# Zeitstempel für Logeintrag
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# INPUT-Ordner: Dateien zählen ohne zu modifizieren
$inputFiles = Get-ChildItem -Path $inputPath -File -ErrorAction SilentlyContinue | 
              Where-Object { $fileExtensions -contains $_.Extension.ToLower() }
$inputCount = $inputFiles.Count
$inputFileNames = ($inputFiles | Select-Object -ExpandProperty Name) -join ','

# ARCHIV-Ordner: Dateien zählen
$archivFiles = Get-ChildItem -Path $archivPath -File -ErrorAction SilentlyContinue
$archivCount = $archivFiles.Count

# ERROR-Ordner: Dateien zählen
$errorFiles = Get-ChildItem -Path $errorPath -File -ErrorAction SilentlyContinue
$errorCount = $errorFiles.Count

# Status-Log aktualisieren
"$timestamp;$inputCount;$archivCount;$errorCount" | Out-File -Append -FilePath $statusLog -Encoding UTF8

# Input-Detail-Log aktualisieren
"$timestamp;$inputCount;$inputFileNames" | Out-File -Append -FilePath $inputDetailLog -Encoding UTF8

# Nachträgliche Fehlerverarbeitung (nur für Dateien, die noch nicht gesehen wurden und älter als 1 Minute sind)
$errorFilesForProcessing = Get-ChildItem -Path $errorPath -Filter "*.error" -File -ErrorAction SilentlyContinue | 
                           Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }
foreach ($errFile in $errorFilesForProcessing) {
    if ($seen -contains $errFile.Name) { continue }
    
    try {
        $errorFilename = $errFile.Name
        
        # .error-Datei lesen
        $errorText = Get-Content $errFile.FullName -ErrorAction Stop | Out-String
        $errorText = $errorText.Trim().Replace("`r`n", " ")
        if ($errorText.Length -gt 300) { $errorText = $errorText.Substring(0,300) }

        # Zugehörige .ext-Datei suchen und lesen
        $basename = [System.IO.Path]::GetFileNameWithoutExtension($errorFilename)
        $extFilename = "$basename.ext"
        $extPath = Join-Path $errorPath $extFilename
        $extText = ""
        
        if (Test-Path $extPath) {
            $extText = Get-Content $extPath -ErrorAction Stop | Out-String
            $extText = $extText.Trim().Replace("`r`n", " ")
            if ($extText.Length -gt 300) { $extText = $extText.Substring(0,300) }
        } else {
            $extText = "[Keine ext-Datei gefunden]"
        }

        # Fehlerlog schreiben
        "$timestamp;$errorFilename;$errorText;$extFilename;$extText" | Out-File -FilePath $errorLog -Append -Encoding UTF8

        # Gesehen-Liste aktualisieren
        Add-Content $seenList $errorFilename
    }
    catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($errFile.Name) - $_"
    }
}

Write-Host "AFM abgeschlossen."
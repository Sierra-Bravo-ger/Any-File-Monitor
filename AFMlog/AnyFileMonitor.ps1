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

# RegEx-Ausdrücke für die Überwachung des Fehler-Logs
$errorPatterns = @()
if ($config.ContainsKey('errorPatterns')) {
    $errorPatterns = ($config['errorPatterns'] -split ',') | ForEach-Object { $_.Trim() }
}

# Pfad für das Muster-Log (Treffer der RegEx-Ausdrücke)
$patternLogPath = Join-Path $PSScriptRoot "AFM_pattern_matches.csv"

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

# Alle .error und .ext Dateien sammeln
$errorFilesForProcessing = Get-ChildItem -Path $errorPath -Filter "*.error" -File -ErrorAction SilentlyContinue | 
                           Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }
$extFilesForProcessing = Get-ChildItem -Path $errorPath -Filter "*.ext" -File -ErrorAction SilentlyContinue | 
                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) }

# Liste für bereits verarbeitete .ext-Dateien
$processedExtFiles = @()

# Liste für gefundene Muster
$patternMatches = @()

# Verarbeitung von .error-Dateien (mit oder ohne zugehörige .ext-Dateien)
foreach ($errFile in $errorFilesForProcessing) {
    if ($seen -contains $errFile.Name) { continue }
    
    try {
        $errorFilename = $errFile.Name
        $basename = [System.IO.Path]::GetFileNameWithoutExtension($errorFilename)
        
        # .error-Datei lesen
        $errorText = Get-Content $errFile.FullName -ErrorAction Stop | Out-String
        $errorText = $errorText.Trim().Replace("`r`n", " ")
        if ($errorText.Length -gt 1500) { $errorText = $errorText.Substring(0,1500) }

        # Zugehörige .ext-Datei suchen und lesen
        $extFilename = "$basename.ext"
        $extPath = Join-Path $errorPath $extFilename
        $extText = ""
        
        if (Test-Path $extPath) {
            $extText = Get-Content $extPath -ErrorAction Stop | Out-String
            $extText = $extText.Trim().Replace("`r`n", " ")
            if ($extText.Length -gt 1500) { $extText = $extText.Substring(0,1500) }
            # Merken, dass diese .ext-Datei bereits verarbeitet wurde
            $processedExtFiles += $extFilename
        } else {
            $extText = "[Keine ext-Datei gefunden]"
        }

        # Fehlerlog schreiben
        "$timestamp;$errorFilename;$errorText;$extFilename;$extText" | Out-File -FilePath $errorLog -Append -Encoding UTF8

        # Prüfen, ob der Fehlertext einen der konfigurierten RegEx-Ausdrücke enthält
        foreach ($pattern in $errorPatterns) {
            if ($errorText -match $pattern) {
                $patternMatches += [PSCustomObject]@{
                    Zeitpunkt = $timestamp
                    Datei = $errorFilename
                    Muster = $pattern
                    Text = $errorText
                }
                break  # Ein Treffer pro Datei reicht
            }
        }

        # Gesehen-Liste aktualisieren
        Add-Content $seenList $errorFilename
    }
    catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($errFile.Name) - $_"
    }
}

# Verarbeitung von .ext-Dateien ohne zugehörige .error-Dateien
foreach ($extFile in $extFilesForProcessing) {
    $extFilename = $extFile.Name
    
    # Überspringen, wenn die .ext-Datei bereits verarbeitet wurde oder in der gesehen-Liste ist
    if ($processedExtFiles -contains $extFilename -or $seen -contains $extFilename) { continue }
    
    $basename = [System.IO.Path]::GetFileNameWithoutExtension($extFilename)
    $errorFilename = "$basename.error"
    $errorPath = Join-Path $errorPath $errorFilename
    
    # Nur verarbeiten, wenn keine zugehörige .error-Datei existiert
    if (Test-Path $errorPath) { continue }
    
    try {
        # .ext-Datei lesen
        $extText = Get-Content $extFile.FullName -ErrorAction Stop | Out-String
        $extText = $extText.Trim().Replace("`r`n", " ")
        if ($extText.Length -gt 1500) { $extText = $extText.Substring(0,1500) }

        # Fehlerlog schreiben
        "$timestamp;[Keine error-Datei gefunden];[Kein Fehlertext verfügbar];$extFilename;$extText" | Out-File -FilePath $errorLog -Append -Encoding UTF8

        # Gesehen-Liste aktualisieren
        Add-Content $seenList $extFilename
    }
    catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($extFile.Name) - $_"
    }
}

# Muster-Log aktualisieren, falls Treffer gefunden wurden
if ($patternMatches.Count -gt 0) {
    # Überschrift erstellen, falls die Datei noch nicht existiert
    if (!(Test-Path $patternLogPath)) {
        "Zeitpunkt;Datei;Muster;Text" | Out-File -FilePath $patternLogPath -Encoding UTF8
    }
    
    # Treffer ins Log schreiben
    foreach ($match in $patternMatches) {
        "$($match.Zeitpunkt);$($match.Datei);$($match.Muster);$($match.Text)" | Out-File -FilePath $patternLogPath -Append -Encoding UTF8
    }
    
    # Ausgabe der Anzahl gefundener Muster
    Write-Host "Es wurden $($patternMatches.Count) Muster in den Fehlertexten gefunden."
}

Write-Host "AFM abgeschlossen."
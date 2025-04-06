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

# E-Mail-Konfiguration aus config.ini laden
$emailEnabled = $false
if ($config.ContainsKey('emailEnabled') -and $config['emailEnabled'] -eq 'true') {
    $emailEnabled = $true
    $emailSmtpServer = $config['emailSmtpServer']
    $emailSmtpPort = [int]$config['emailSmtpPort']
    $emailUseSSL = $config['emailUseSSL'] -eq 'true'
    $emailFrom = $config['emailFrom']
    $emailTo = ($config['emailTo'] -split ',') | ForEach-Object { $_.Trim() }
    $emailSubject = $config['emailSubject']
    $emailUsername = $config['emailUsername']
    $emailPassword = $config['emailPassword']
    $emailMinPatternMatches = [int]$config['emailMinPatternMatches']
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
    "Zeitpunkt;Anzahl;Dateinamen als String" | Out-File -FilePath $inputDetailLog -Encoding UTF8
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

# Optimierung: Nur die ersten 5 Dateien für die CSV-Datei verwenden
$inputFileNamesForLog = ""
if ($inputCount -gt 0) {
    # Begrenzen auf maximal 5 Dateien, um CSV-Größe zu reduzieren
    $samplesToShow = [Math]::Min(5, $inputCount)
    $filenameSamples = $inputFiles | Select-Object -First $samplesToShow | Select-Object -ExpandProperty Name
    
    if ($inputCount -le $samplesToShow) {
        $inputFileNamesForLog = $filenameSamples -join ','
    } else {
        # Bei mehr als 5 Dateien werden nur Beispiele angezeigt
        $inputFileNamesForLog = ($filenameSamples -join ',') + "... (und $($inputCount - $samplesToShow) weitere)"
    }
}

# ARCHIV-Ordner: Dateien zählen
$archivFiles = Get-ChildItem -Path $archivPath -File -ErrorAction SilentlyContinue
$archivCount = $archivFiles.Count

# ERROR-Ordner: Dateien zählen
$errorFiles = Get-ChildItem -Path $errorPath -File -ErrorAction SilentlyContinue
$errorCount = $errorFiles.Count

# Status-Log aktualisieren
"$timestamp;$inputCount;$archivCount;$errorCount" | Out-File -Append -FilePath $statusLog -Encoding UTF8

# Input-Detail-Log aktualisieren
"$timestamp;$inputCount;$inputFileNamesForLog" | Out-File -Append -FilePath $inputDetailLog -Encoding UTF8

# Nachträgliche Fehlerverarbeitung (nur für Dateien, die noch nicht gesehen wurden und älter als 1 Minute sind)

# Alle Dateien im Error-Ordner sammeln, die den konfigurierten Erweiterungen entsprechen und älter als 1 Minute sind
$allFilesForProcessing = Get-ChildItem -Path $errorPath -File -ErrorAction SilentlyContinue | 
                        Where-Object { 
                            $fileExtensions -contains $_.Extension.ToLower() -and 
                            $_.LastWriteTime -lt (Get-Date).AddMinutes(-1) 
                        }

# Dateien nach Typ filtern
$errorFilesForProcessing = $allFilesForProcessing | Where-Object { $_.Extension.ToLower() -eq ".error" }
$extFilesForProcessing = $allFilesForProcessing | Where-Object { $_.Extension.ToLower() -eq ".ext" }
$otherFilesForProcessing = $allFilesForProcessing | Where-Object { 
    $_.Extension.ToLower() -ne ".error" -and $_.Extension.ToLower() -ne ".ext" 
}

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
    $errorFilePath = Join-Path $errorPath $errorFilename  # Variable umbenannt, um Überschreibung zu vermeiden
    
    # Nur verarbeiten, wenn keine zugehörige .error-Datei existiert
    if (Test-Path $errorFilePath) { continue }
    
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

# Verarbeitung anderer Dateitypen (nicht .error oder .ext)
foreach ($otherFile in $otherFilesForProcessing) {
    if ($seen -contains $otherFile.Name) { continue }
    
    try {
        $filename = $otherFile.Name
        # Datei lesen
        $fileContent = Get-Content $otherFile.FullName -ErrorAction Stop | Out-String
        $fileContent = $fileContent.Trim().Replace("`r`n", " ")
        if ($fileContent.Length -gt 1500) { $fileContent = $fileContent.Substring(0,1500) }
        
        # Fehlerlog schreiben
        "$timestamp;[Keine error-Datei gefunden];[Kein Fehlertext verfügbar];$filename;$fileContent" | Out-File -FilePath $errorLog -Append -Encoding UTF8
        
        # Prüfen, ob der Dateiinhalt einen der konfigurierten RegEx-Ausdrücke enthält
        foreach ($pattern in $errorPatterns) {
            if ($fileContent -match $pattern) {
                $patternMatches += [PSCustomObject]@{
                    Zeitpunkt = $timestamp
                    Datei = $filename
                    Muster = $pattern
                    Text = $fileContent
                }
                break  # Ein Treffer pro Datei reicht
            }
        }
        
        # Gesehen-Liste aktualisieren
        Add-Content $seenList $filename
    }
    catch {
        Write-Host "Warnung: Fehler beim Verarbeiten von $($otherFile.Name) - $_"
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
    
    # E-Mail senden, wenn aktiviert und genügend Muster gefunden wurden
    if ($emailEnabled -and $patternMatches.Count -ge $emailMinPatternMatches) {
        try {
            # E-Mail-Inhalt erstellen
            $emailBody = @"
Hallo,

das AnyFileMonitor-Skript hat $($patternMatches.Count) Muster in den Fehlertexten gefunden.

Details zu den gefundenen Mustern:

"@
            
            # Die ersten 10 Muster (oder alle, wenn weniger) in den E-Mail-Text einfügen
            $maxDetailsToShow = [Math]::Min(10, $patternMatches.Count)
            for ($i = 0; $i -lt $maxDetailsToShow; $i++) {
                $match = $patternMatches[$i]
                $emailBody += @"

Datei: $($match.Datei)
Muster: $($match.Muster)
Text: $($match.Text)
Zeitpunkt: $($match.Zeitpunkt)
-------------------------------
"@
            }
            
            if ($patternMatches.Count -gt 10) {
                $emailBody += @"

... und $(($patternMatches.Count) - 10) weitere Treffer.

"@
            }
            
            $emailBody += @"

Mit freundlichen Grueßen,
Ihr AnyFileMonitor
"@
            
            # Sichere Anmeldeinformationen erstellen
            $securePassword = ConvertTo-SecureString $emailPassword -AsPlainText -Force
            $credentials = New-Object System.Management.Automation.PSCredential ($emailUsername, $securePassword)
            
            # E-Mail-Parameter
            $mailParams = @{
                SmtpServer = $emailSmtpServer
                Port = $emailSmtpPort
                UseSsl = $emailUseSSL
                From = $emailFrom
                To = $emailTo
                Subject = "$emailSubject ($($patternMatches.Count) Muster gefunden)"
                Body = $emailBody
                Credential = $credentials
            }
            
            # E-Mail senden
            Send-MailMessage @mailParams
            
            Write-Host "E-Mail mit Fehlerdetails wurde gesendet."
        }
        catch {
            Write-Host "Fehler beim Senden der E-Mail: $_"
        }
    }
}

Write-Host "AFM abgeschlossen."
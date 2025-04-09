# AFM_Exporter.ps1
# Macht AFM-CSV-Daten über Port 9500 als Prometheus-kompatiblen Export verfügbar

# Parameter für den Server
param(
    [int]$Port = 9500,
    [switch]$ExternalAccess
)

# Funktion zum Finden eines freien Ports
function Find-FirstFreePort {
    param (
        [int]$StartPort = 9500,
        [int]$MaxPort = 9600
    )
    
    for ($port = $StartPort; $port -le $MaxPort; $port++) {
        $tcpListener = $null
        try {
            $tcpListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
            $tcpListener.Start()
            return $port
        } catch {
            # Port ist bereits belegt, nächsten probieren
            Write-Host "Port $port ist belegt oder nicht verfügbar, versuche nächsten Port..." -ForegroundColor Yellow
            continue
        } finally {
            if ($tcpListener -ne $null) {
                $tcpListener.Stop()
            }
        }
    }
    
    throw "Kein freier Port zwischen $StartPort und $MaxPort gefunden"
}

# Funktion zur URL-Reservierung für nicht-administrative Benutzer
function Add-UrlAcl {
    param (
        [string]$Url
    )
    
    try {
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        Write-Host "Versuche URL-Reservierung für $Url..." -ForegroundColor Yellow
        
        # Überprüfen, ob die URL-Reservierung bereits existiert
        $existingAcls = netsh http show urlacl url=$Url | Out-String
        
        if ($existingAcls -like "*$Url*") {
            Write-Host "URL-Reservierung für $Url existiert bereits." -ForegroundColor Green
            return $true
        }
        
        # Versuchen, die URL mit Administrator-Rechten zu reservieren
        $addResult = netsh http add urlacl url=$Url user="$currentUser" listen=yes
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "URL-Reservierung für $Url erfolgreich hinzugefügt." -ForegroundColor Green
            return $true
        } else {
            Write-Host "Fehler bei der URL-Reservierung: $addResult" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Fehler bei der URL-Reservierung: $_" -ForegroundColor Red
        return $false
    }
}

# Funktion zum Überprüfen von Administrator-Rechten
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$csvPath1 = Join-Path $PSScriptRoot 'AFM_status_log.csv'
$csvPath2 = Join-Path $PSScriptRoot 'AFM_pattern_matches.csv'
$csvPath3 = Join-Path $PSScriptRoot 'AFM_input_details.csv'
$csvPath4 = Join-Path $PSScriptRoot 'AFM_error_log.csv'

# Versuchen, einen freien Port zu finden
$port = $Port
try {
    # Prüfen, ob der gewünschte Port verfügbar ist
    $ipAddress = if ($ExternalAccess) { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Loopback }
    $tcpTest = New-Object System.Net.Sockets.TcpListener($ipAddress, $port)
    $tcpTest.Start()
    $tcpTest.Stop()
} catch {
    # Port ist nicht verfügbar, einen alternativen Port suchen
    Write-Host "Port $port ist nicht verfügbar. Suche einen alternativen Port..." -ForegroundColor Yellow
    $port = Find-FirstFreePort
    Write-Host "Freier Port gefunden: $port" -ForegroundColor Green
}

# HTTP Listener mit Fehlerbehandlung initialisieren
$listener = $null
$maxRetries = 3
$retryCount = 0
$success = $false

# Bestimme die richtige Präfix-URL basierend auf ExternalAccess
$listenerPrefix = if ($ExternalAccess) { 
    # Bei externem Zugriff überprüfen, ob Admin-Rechte vorhanden sind
    $isAdmin = Test-Administrator
    
    if ($isAdmin) {
        "http://+:$port/"
    } else {
        Write-Host "WARNUNG: Für externe URL-Bindung (http://+:$port/) sind Administrator-Rechte erforderlich." -ForegroundColor Yellow
        Write-Host "Verwende stattdessen Netzwerk-IP-Adressen für externen Zugriff..." -ForegroundColor Yellow
        
        # Versuche eigene IP-Adressen statt "+" zu binden
        $hostname = [System.Net.Dns]::GetHostName()
        $ips = [System.Net.Dns]::GetHostAddresses($hostname) | Where-Object { $_.AddressFamily -eq 'InterNetwork' }
        
        if ($ips.Count -gt 0) {
            # Wir verwenden die erste verfügbare IP-Adresse
            $firstIp = $ips[0].IPAddressToString
            Write-Host "Verwende IP $firstIp für externe Verbindungen." -ForegroundColor Green
            "http://$firstIp`:$port/"
        } else {
            # Fallback auf localhost, wenn keine IP gefunden wurde
            Write-Host "Keine Netzwerk-IP gefunden. Fallback auf localhost." -ForegroundColor Yellow
            "http://localhost:$port/"
        }
    }
} else {
    "http://localhost:$port/"
}

if ($listenerPrefix -like "http://+*" -and -not (Test-Administrator)) {
    Write-Host "HINWEIS: Um als nicht-Administrator eine URL-Reservierung für $listenerPrefix zu erstellen:" -ForegroundColor Cyan
    Write-Host "Führen Sie EINMALIG den folgenden Befehl als Administrator aus:" -ForegroundColor Cyan
    Write-Host "netsh http add urlacl url=$listenerPrefix user=$env:USERDOMAIN\$env:USERNAME listen=yes" -ForegroundColor White -BackgroundColor DarkBlue
}

while (-not $success -and $retryCount -lt $maxRetries) {
    try {
        Write-Host "Versuche HTTP-Listener zu starten für $listenerPrefix..." -ForegroundColor Cyan
        $listener = [System.Net.HttpListener]::new()
        $listener.Prefixes.Add($listenerPrefix)
        $listener.Start()
        $success = $true
        Write-Host "HTTP-Listener erfolgreich gestartet!" -ForegroundColor Green
    } catch [System.Net.HttpListenerException] {
        $retryCount++
        $errorCode = $_.Exception.ErrorCode
        
        # Detaillierte Fehlerbehandlung basierend auf Windows-Fehlercodes
        if ($errorCode -eq 5) {  # ERROR_ACCESS_DENIED
            Write-Host "Zugriff verweigert. Sie benötigen Administrator-Rechte für diesen Port oder eine URL-Reservierung." -ForegroundColor Red
            
            # Versuche URL-Reservierung (wird nur funktionieren wenn als Admin ausgeführt)
            if ($listenerPrefix -like "http://+*" -and (Test-Administrator)) {
                $urlAclSuccess = Add-UrlAcl -Url $listenerPrefix
                if ($urlAclSuccess) {
                    # URL-Reservierung war erfolgreich, also zurücksetzen und erneut versuchen
                    $retryCount = 0
                    continue
                }
            }
            
            # Bei fehlgeschlagener URL-Reservierung auf localhost zurückfallen
            if ($listenerPrefix -ne "http://localhost:$port/") {
                Write-Host "Falle zurück auf localhost-Binding..." -ForegroundColor Yellow
                $listenerPrefix = "http://localhost:$port/"
                $retryCount = 0
                continue
            }
        } elseif ($errorCode -eq 183) {  # ERROR_ALREADY_EXISTS
            Write-Host "Port bereits in Verwendung. Versuche einen anderen Port..." -ForegroundColor Red
            $port = Find-FirstFreePort -StartPort ($port + 1)
            $listenerPrefix = $listenerPrefix -replace ":\d+/", ":$port/"
            $retryCount = 0
            continue
        } else {
            Write-Host "Fehler beim Starten des HTTP-Listeners (Code $errorCode). Versuch $retryCount von $maxRetries..." -ForegroundColor Yellow
            Start-Sleep -Seconds 1
        }
    } catch {
        Write-Host "Unerwarteter Fehler: $_" -ForegroundColor Red
        throw
    }
}

if (-not $success) {
    Write-Host "Konnte den HTTP-Listener nicht starten. Bitte führen Sie das Skript mit Administrator-Berechtigungen aus oder verwenden Sie einen anderen Port mit dem -Port Parameter." -ForegroundColor Red
    exit 1
}

# Zugriffstyp anzeigen
$hostname = [System.Net.Dns]::GetHostName()
$ipAddresses = [System.Net.Dns]::GetHostAddresses($hostname) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | ForEach-Object { $_.IPAddressToString }

Write-Host "🟢 AFM Exporter läuft erfolgreich unter $listenerPrefix"
if ($listenerPrefix -like "http://localhost*") {
    Write-Host "Metrics verfügbar unter: http://localhost:$port/metrics" -ForegroundColor Green
    
    if (-not $ExternalAccess) {
        Write-Host "`nFÜR EXTERNEN ZUGRIFF:" -ForegroundColor Yellow 
        Write-Host "Starten Sie mit diesem Befehl: .\AFM_exporter.ps1 -ExternalAccess" -ForegroundColor Yellow
        Write-Host "Hinweis: Externe URL-Konfiguration erfordert URL-Reservierungen oder Administrator-Berechtigungen" -ForegroundColor Yellow
    } else {
        Write-Host "`nWARNUNG: Externer Zugriff wurde angefordert, aber es konnte nur localhost gebunden werden." -ForegroundColor Red
        Write-Host "Für externen Zugriff führen Sie das Skript als Administrator aus oder erstellen Sie eine URL-Reservierung." -ForegroundColor Yellow
    }
} else {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "EXTERNER ZUGRIFF AKTIVIERT!" -ForegroundColor Green
    Write-Host "Metrics sind erreichbar unter:" -ForegroundColor Green
    
    if ($listenerPrefix -like "http://+*") {
        Write-Host "  http://localhost:$port/metrics (lokal)" -ForegroundColor Green
        foreach ($ip in $ipAddresses) {
            Write-Host "  http://$ip`:$port/metrics (im Netzwerk)" -ForegroundColor Green
        }
    } else {
        # Wenn spezifische IP gebunden wurde
        $boundIp = $listenerPrefix -replace "http://([^:]+):\d+/", '$1'
        Write-Host "  http://$boundIp`:$port/metrics (gebundene IP)" -ForegroundColor Green
    }
    
    Write-Host "`nHINWEISE:" -ForegroundColor Yellow
    Write-Host "- Stellen Sie sicher, dass Port $port in Ihrer Firewall freigegeben ist" -ForegroundColor Yellow
    Write-Host "- Verwenden Sie diese URL in Ihrer Prometheus-Konfiguration" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan
}

Write-Host "Drücken Sie Strg+C zum Beenden" -ForegroundColor Yellow

function Get-PrometheusMetricsFromCSV {
    param (
        [string]$csvPath,
        [string]$metricPrefix,
        [switch]$hasHeader
    )
    
    if (!(Test-Path $csvPath) -or (Get-Item $csvPath).Length -eq 0) {
        return ""
    }
    
    $lines = Get-Content $csvPath -Encoding UTF8 | Where-Object { $_ -match ';' }
    if ($lines.Count -lt 2 -and $hasHeader) {
        return ""
    }
    
    $metricsArray = @()
    
    # Verwende die letzte Zeile für Status-Metriken
    if ($metricPrefix -eq "afm") {
        $lastLine = $lines[-1] -split ';'
        $metricsArray += "afm_processed_files_total $([int]$lastLine[1])"
        $metricsArray += "afm_error_files_total $([int]$lastLine[2])"
        $metricsArray += "afm_archived_files_total $([int]$lastLine[3])"
        $metricsArray += "afm_last_run_timestamp $([int][double]::Parse((Get-Date -UFormat %s)))"
        return $metricsArray -join "`n"
    }
    
    # Pattern Matches (csvPath2)
    elseif ($metricPrefix -eq "pattern") {
        try {
            $headerLine = $lines[0] -split ';'
            $dataLine = $lines[-1] -split ';'
            
            for ($i = 1; $i -lt $headerLine.Count; $i++) {
                if ($dataLine[$i] -match '^\d+$') {
                    $metricName = $headerLine[$i] -replace '[^a-zA-Z0-9_]', '_'
                    $metricsArray += "afm_pattern_match_{0} {1}" -f $metricName.ToLower(), [int]$dataLine[$i]
                }
            }
        } catch {
            Write-Host "Fehler beim Verarbeiten von Pattern Matches: $_" -ForegroundColor Yellow
        }
    }
    
    # Input Details (csvPath3)
    elseif ($metricPrefix -eq "input") {
        try {
            $data = $lines | ForEach-Object { 
                $line = $_ -split ';'
                [PSCustomObject]@{
                    Timestamp = $line[0]
                    InputType = $line[1]
                    Count = [int]$line[2]
                }
            }
            
            $groupedData = $data | Group-Object -Property InputType
            foreach ($group in $groupedData) {
                $inputType = $group.Name -replace '[^a-zA-Z0-9_]', '_'
                $count = ($group.Group | Measure-Object -Property Count -Sum).Sum
                $metricsArray += "afm_input_type_{0}_total {1}" -f $inputType.ToLower(), $count
            }
        } catch {
            Write-Host "Fehler beim Verarbeiten von Input Details: $_" -ForegroundColor Yellow
        }
    }
    
    # Error Log (csvPath4)
    elseif ($metricPrefix -eq "error") {
        try {
            # Config-Dateipfad und Pattern-Muster
            $configPath = Join-Path $PSScriptRoot 'config.ini'
            $errorPatterns = @()
            $excludePatterns = @()
            
            # Muster aus config.ini laden, falls vorhanden
            if (Test-Path $configPath) {
                $configContent = Get-Content $configPath -Raw
                
                # Error Patterns laden
                if ($configContent -match 'errorPatterns=([^\r\n]*)') {
                    $errorPatternsString = $matches[1]
                    $errorPatterns = $errorPatternsString -split ',' | ForEach-Object { $_.Trim() }
                }
                
                # Exclude Patterns laden
                if ($configContent -match 'excludePatterns=([^\r\n]*)') {
                    $excludePatternsString = $matches[1]
                    $excludePatterns = $excludePatternsString -split ',' | ForEach-Object { $_.Trim() }
                }
            }
            
            # Initialisiere Pattern-Match Zähler
            $patternMatches = @{}
            foreach ($pattern in $errorPatterns) {
                if ($pattern) {
                    $metricName = $pattern -replace '[^a-zA-Z0-9_]', '_'
                    $patternMatches[$metricName.ToLower()] = 0
                }
            }
            
            # Erfassen der Fehlerstatistiken
            $totalErrors = 0
            $testErrors = 0
            $otherErrors = 0
            $errorsByHour = @{}
            $latestErrorTimestamp = 0
            
            # Alle Fehlerzeilen durchgehen
            $lines | ForEach-Object { 
                $line = $_ -split ';'
                if ($line.Count -ge 2) {
                    $timestamp = $line[0]
                    $errorMessage = $line[1]
                    
                    # Versuche, den Zeitpunkt zu parsen
                    $errorTime = $null
                    if ([DateTime]::TryParse($timestamp, [ref]$errorTime)) {
                        # Stündliche Fehlerrate erfassen
                        $hourKey = $errorTime.ToString("yyyy-MM-dd HH:00:00")
                        if (-not $errorsByHour.ContainsKey($hourKey)) {
                            $errorsByHour[$hourKey] = 0
                        }
                        $errorsByHour[$hourKey]++
                        
                        # Erfasse den neuesten Fehler-Zeitstempel
                        $errorTimestamp = [int][double]::Parse((Get-Date $errorTime -UFormat %s))
                        if ($errorTimestamp -gt $latestErrorTimestamp) {
                            $latestErrorTimestamp = $errorTimestamp
                        }
                    }
                    
                    # Prüfen ob der Fehler in den Ausschlussmustern enthalten ist
                    $excluded = $false
                    foreach ($pattern in $excludePatterns) {
                        if ($pattern -and $errorMessage -match $pattern) {
                            $excluded = $true
                            break
                        }
                    }
                    
                    # Wenn der Fehler nicht ausgeschlossen ist, verarbeiten
                    if (-not $excluded) {
                        $totalErrors++
                        
                        # Testfehler vs. andere Fehler unterscheiden
                        if ($errorMessage -match "test\d+") {
                            $testErrors++
                        } else {
                            $otherErrors++
                        }
                        
                        # Pattern-Matches zählen
                        foreach ($pattern in $errorPatterns) {
                            if ($pattern -and $errorMessage -match $pattern) {
                                $metricName = $pattern -replace '[^a-zA-Z0-9_]', '_'
                                $patternMatches[$metricName.ToLower()]++
                            }
                        }
                    }
                }
            }
            
            # Basis-Metriken hinzufügen
            $metricsArray += "afm_errors_total $totalErrors"
            $metricsArray += "afm_errors_test_total $testErrors"
            $metricsArray += "afm_errors_other_total $otherErrors"
            
            # Pattern-Match Metriken hinzufügen
            foreach ($key in $patternMatches.Keys) {
                $metricsArray += "afm_pattern_match_$key $($patternMatches[$key])"
            }
            
            # Zeitbezogene Metriken hinzufügen
            if ($latestErrorTimestamp -gt 0) {
                $metricsArray += "afm_last_error_timestamp $latestErrorTimestamp"
            }
            
            # Fehlerrate pro Stunde über die letzten 24 Stunden
            $now = Get-Date
            for ($i = 0; $i -lt 24; $i++) {
                $hourTime = $now.AddHours(-$i)
                $hourKey = $hourTime.ToString("yyyy-MM-dd HH:00:00")
                $count = if ($errorsByHour.ContainsKey($hourKey)) { $errorsByHour[$hourKey] } else { 0 }
                
                $timestamp = [int][double]::Parse((Get-Date $hourTime -UFormat %s))
                $metricsArray += "afm_errors_hourly{hour=`"$hourKey`", offset=`"$i`"} $count"
            }
            
        } catch {
            Write-Host "Fehler beim Verarbeiten von Error Logs: $_" -ForegroundColor Yellow
        }
    }
    
    return $metricsArray -join "`n"
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $response = $context.Response

            # Metriken aus allen vier CSV-Dateien sammeln
            $metricsStatus = Get-PrometheusMetricsFromCSV -csvPath $csvPath1 -metricPrefix "afm" -hasHeader
            $metricsPattern = Get-PrometheusMetricsFromCSV -csvPath $csvPath2 -metricPrefix "pattern" -hasHeader
            $metricsInput = Get-PrometheusMetricsFromCSV -csvPath $csvPath3 -metricPrefix "input"
            $metricsError = Get-PrometheusMetricsFromCSV -csvPath $csvPath4 -metricPrefix "error"

            # Fallback für Status-Metriken
            if ([string]::IsNullOrEmpty($metricsStatus)) {
                $metricsStatus = "afm_processed_files_total 0`nafm_error_files_total 0`nafm_archived_files_total 0"
            }

            # Alle Metriken kombinieren
            $allMetrics = @($metricsStatus, $metricsPattern, $metricsInput, $metricsError) | 
                Where-Object { -not [string]::IsNullOrEmpty($_) }
            try {
                $metrics = $allMetrics -join "`n"
            } 
            catch {
                Write-Host "Fehler beim Kombinieren der Metriken: $_" -ForegroundColor Red
                $metrics = "afm_processed_files_total 0`nafm_error_files_total 0`nafm_archived_files_total 0"
            } 
            finally {
                Write-Host "Versuch abgeschlossen, Metriken zu kombinieren." -ForegroundColor Cyan
            }

            $output = [System.Text.Encoding]::UTF8.GetBytes($metrics + "`n")
            $response.ContentType = "text/plain"
            $response.OutputStream.Write($output, 0, $output.Length)
            $response.OutputStream.Close()
        }
        catch {
            Write-Host "Fehler bei der Verarbeitung einer Anfrage: $_" -ForegroundColor Red
        }
    }
} 
catch {
    Write-Host "Fehler: $_" -ForegroundColor Red
}
finally {
    # HTTP-Listener sauber beenden
    if ($listener -ne $null -and $listener.IsListening) {
        $listener.Stop()
        $listener.Close()
        Write-Host "HTTP-Listener wurde beendet." -ForegroundColor Cyan
    }
}
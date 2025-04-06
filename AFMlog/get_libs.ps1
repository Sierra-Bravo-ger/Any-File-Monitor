# Verzeichnisse erstellen
$libsDir = ".\AFMlog\libs"
$cssDir = "$libsDir\css"
$jsDir = "$libsDir\js"
$fontsDir = "$libsDir\fonts"

New-Item -ItemType Directory -Force -Path $cssDir | Out-Null
New-Item -ItemType Directory -Force -Path $jsDir | Out-Null
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null

Write-Host "Verzeichnisse erstellt" -ForegroundColor Green

# URLs für den Download
$downloads = @{
    "$cssDir\material.indigo-pink.min.css" = "https://code.getmdl.io/1.3.0/material.indigo-pink.min.css"
    "$jsDir\material.min.js" = "https://code.getmdl.io/1.3.0/material.min.js"
    "$jsDir\papaparse.min.js" = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"
    "$jsDir\chart.js" = "https://cdn.jsdelivr.net/npm/chart.js"
    "$jsDir\chartjs-plugin-datalabels.js" = "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"
    "$jsDir\moment.min.js" = "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"
    "$jsDir\moment-de.js" = "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/locale/de.js"
    "$jsDir\chartjs-chart-matrix.min.js" = "https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@1.1.1/dist/chartjs-chart-matrix.min.js"
}

# Dateien herunterladen
foreach ($file in $downloads.Keys) {
    $url = $downloads[$file]
    Write-Host "Lade herunter: $url -> $file" -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction Stop
        Write-Host "  Erfolgreich heruntergeladen" -ForegroundColor Green
    }
    catch {
        Write-Host "  Fehler beim Herunterladen: $_" -ForegroundColor Red
    }
}

# Material Icons Schriftart herunterladen (komplexer)
Write-Host "Lade Material Icons herunter..." -ForegroundColor Cyan
$materialIconsUrl = "https://fonts.googleapis.com/icon?family=Material+Icons"
$iconsCssFile = "$fontsDir\material-icons.css"

try {
    $response = Invoke-WebRequest -Uri $materialIconsUrl -ErrorAction Stop
    $cssContent = $response.Content
    
    # CSS speichern
    Set-Content -Path $iconsCssFile -Value $cssContent
    
    # Font-Dateien aus CSS extrahieren und herunterladen
    $fontUrls = [regex]::Matches($cssContent, 'url\((https://[^)]+)\)')
    foreach ($fontUrl in $fontUrls) {
        $url = $fontUrl.Groups[1].Value
        $fontFileName = $url.Split('/')[-1]
        $fontFilePath = "$fontsDir\$fontFileName"
        
        Write-Host "  Lade Font herunter: $url -> $fontFilePath" -ForegroundColor Cyan
        try {
            Invoke-WebRequest -Uri $url -OutFile $fontFilePath -ErrorAction Stop
            
            # Update CSS to use local font
            $cssContent = $cssContent.Replace($url, "../fonts/$fontFileName")
        }
        catch {
            Write-Host "  Fehler beim Herunterladen der Schriftart: $_" -ForegroundColor Red
        }
    }
    
    # Updated CSS speichern
    Set-Content -Path $iconsCssFile -Value $cssContent
    Write-Host "Material Icons CSS und Schriftarten erfolgreich heruntergeladen" -ForegroundColor Green
}
catch {
    Write-Host "Fehler beim Herunterladen der Material Icons: $_" -ForegroundColor Red
}

Write-Host "Download abgeschlossen!" -ForegroundColor Green
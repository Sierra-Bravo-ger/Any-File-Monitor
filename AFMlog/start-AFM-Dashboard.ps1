# Start-AFM-Dashboard.ps1
# Startet einen lokalen Webserver für das AFM-Dashboard (Port 8080)

$port = 8080
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Add-Type -AssemblyName System.Net.HttpListener

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host " AFM-Dashboard wird gestartet..."
Write-Host " Dashboard verfügbar unter: http://localhost:$port/AFM_dashboard.html"
Start-Process "http://localhost:$port/AFM_dashboard.html"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ($path -eq "") { $path = "AFM_dashboard.html" }
        $localPath = Join-Path $root ($path -replace '/', '\')

        if (-not (Test-Path $localPath)) {
            $response.StatusCode = 404
            $writer = New-Object IO.StreamWriter $response.OutputStream
            $writer.WriteLine("404 - Datei nicht gefunden: $path")
            $writer.Close()
            continue
        }

        try {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentType = switch -Wildcard ($localPath) {
                "*.html" { "text/html" }
                "*.csv"  { "text/csv" }
                "*.js"   { "application/javascript" }
                "*.css"  { "text/css" }
                default  { "application/octet-stream" }
            }
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        }
        catch {
            Write-Host "Fehler beim Senden von Datei ${localPath}: ${_}"
            $response.StatusCode = 500
            $writer = New-Object IO.StreamWriter $response.OutputStream
            $writer.WriteLine("500 - Interner Serverfehler")
            $writer.Close()
        }
    }
}
finally {
    # Aufräumen, wenn das Skript beendet wird
    if ($listener -ne $null) {
        $listener.Stop()
        $listener.Close()
        Write-Host "Webserver wurde beendet."
    }
}
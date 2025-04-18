
param (
    [int]$PortNumber = 8080,
    [string]$WebRoot = "."
)

$allowedHosts = @("afmdemo.madmoench.de", "192.168.178.45", "localhost")

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript"
    ".css"  = "text/css"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"  = "font/ttf"
    ".ico"  = "image/x-icon"
    ".map"  = "application/json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$PortNumber/")
$listener.Start()
Write-Host "Static file server läuft auf Port $PortNumber..."

try {
    while ($true) {
        $context = $listener.GetContext()
        if ($null -eq $context) { continue }

        $hostHeader = $context.Request.Headers["Host"]
        if ($null -eq $hostHeader) {
            $context.Response.StatusCode = 400
            $context.Response.Close()
            continue
        }

        $hostOnly = $hostHeader.Split(":")[0]
        Write-Host "Eingehender Host: $hostOnly"

        if ($allowedHosts -notcontains $hostOnly) {
            Write-Host "DENY: $hostOnly"
            $context.Response.StatusCode = 403
            $context.Response.Close()
            continue
        }

        Write-Host "ALLOW: $hostOnly"

        $urlPath = $context.Request.Url.AbsolutePath
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }

        $safePath = Join-Path $WebRoot ($urlPath -replace "/", "\")
        $safePath = [System.IO.Path]::GetFullPath($safePath)

        if (-not $safePath.StartsWith((Get-Item $WebRoot).FullName)) {
            $context.Response.StatusCode = 403
            $context.Response.Close()
            continue
        }

        if (-Not (Test-Path $safePath)) {
            Write-Host "404 NOT FOUND: $safePath"
            $context.Response.StatusCode = 404
            $context.Response.Close()
            continue
        }

        $ext = [System.IO.Path]::GetExtension($safePath).ToLower()
        $contentType = $mimeTypes[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }

        try {
            $bytes = [System.IO.File]::ReadAllBytes($safePath)
            $context.Response.ContentType = $contentType
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        catch {
            Write-Host "FEHLER beim Senden der Datei: $($_.Exception.Message)"
        }
        finally {
            $context.Response.OutputStream.Close()
        }
    }
}
finally {
    $listener.Stop()
    Write-Host "Listener wurde gestoppt."
}

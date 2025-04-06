# LIS_Simulator.ps1
# Script to simulate the behavior of the interface by moving files from INPUT to ARCHIV
# and occasionally generating error files in ARCHIV\ERROR

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load configuration from config.ini
function Get-ConfigValue {
    param (
        [string]$section,
        [string]$key,
        [string]$filePath
    )
    
    $content = Get-Content $filePath -Raw
    if ($content -match "(?m)^\s*$key\s*=\s*(.+?)$") {
        return $Matches[1].Trim()
    }
    return $null
}

$configFile = Join-Path $scriptPath "config.ini"
$inputPath = Join-Path $scriptPath (Get-ConfigValue -section "Paths" -key "inputPath" -filePath $configFile)
$archivPath = Join-Path $scriptPath (Get-ConfigValue -section "Paths" -key "archivPath" -filePath $configFile)
$errorPath = Join-Path $scriptPath (Get-ConfigValue -section "Paths" -key "errorPath" -filePath $configFile)

# Get error patterns from config
$configContent = Get-Content $configFile -Raw
if ($configContent -match "errorPatterns=(.+)") {
    $errorPatterns = $Matches[1].Split(',')
} else {
    $errorPatterns = @("Error occurred", "Connection timeout", "Process failed")
}

# Ensure directories exist
$inputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($inputPath)
$archivPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($archivPath)
$errorPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($errorPath)

if (-not (Test-Path $inputPath)) {
    New-Item -Path $inputPath -ItemType Directory | Out-Null
}
if (-not (Test-Path $archivPath)) {
    New-Item -Path $archivPath -ItemType Directory | Out-Null
}
if (-not (Test-Path $errorPath)) {
    New-Item -Path $errorPath -ItemType Directory | Out-Null
}

Write-Host "LIS Simulator started"
Write-Host "Monitoring path: $inputPath"
Write-Host "Archive path: $archivPath"
Write-Host "Error path: $errorPath"
Write-Host "Press Ctrl+C to stop the simulation"
Write-Host ""

$fileCounter = 0
$errorCounter = 0
$nextErrorAfter = Get-Random -Minimum 20 -Maximum 31

try {
    while ($true) {
        # Get all files in input directory
        $files = Get-ChildItem -Path $inputPath -File
        
        foreach ($file in $files) {
            $fileCounter++
            
            # Random delay between 5-20 seconds
            $delay = Get-Random -Minimum 5 -Maximum 21
            Write-Host "Processing file $($file.Name) (waiting $delay seconds)"
            Start-Sleep -Seconds $delay
            
            # Erhöhen Sie den Fehlerzähler und prüfen Sie, ob ein Fehler generiert werden soll
            $errorCounter++
            Write-Host "Files processed: $fileCounter, Next error after: $nextErrorAfter files, Current count: $errorCounter" -ForegroundColor Cyan
            
            if ($errorCounter -ge $nextErrorAfter) {
                # Move file to ERROR directory
                $targetPath = Join-Path $errorPath $file.Name
                Move-Item -Path $file.FullName -Destination $targetPath -Force
                
                # Create .error file
                $errorContent = $errorPatterns | Get-Random
                $errorFilePath = Join-Path $errorPath "$($file.BaseName).error"
                Set-Content -Path $errorFilePath -Value $errorContent
                
                Write-Host "ERROR: File $($file.Name) moved to error directory. Error: $errorContent" -ForegroundColor Red
                
                # Zurücksetzen des Fehlerzählers und Generieren eines neuen Schwellenwerts
                $errorCounter = 0
                $nextErrorAfter = Get-Random -Minimum 20 -Maximum 31
            } else {
                # Normal case - move to archive
                $targetPath = Join-Path $archivPath $file.Name
                Move-Item -Path $file.FullName -Destination $targetPath -Force
                Write-Host "SUCCESS: File $($file.Name) moved to archive" -ForegroundColor Green
            }
            
            # Small pause between files to avoid overwhelming the system
            Start-Sleep -Milliseconds 500
        }
        
        # Wait a bit before checking for new files
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
} finally {
    Write-Host "LIS Simulator stopped"
}
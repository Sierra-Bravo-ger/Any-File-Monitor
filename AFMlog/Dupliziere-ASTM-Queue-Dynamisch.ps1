param (
    [int]$Start = 88001,
    [int]$End = 98000
)

$sourceFile = "ASTM_TestBlock.ext"
$targetFolder = "..\QUEUE"

# Zielordner erstellen, falls nicht vorhanden
if (-not (Test-Path $targetFolder)) {
    New-Item -Path $targetFolder -ItemType Directory | Out-Null
}

# Dateien duplizieren mit benutzerdefiniertem Bereich
for ($i = $Start; $i -le $End; $i++) {
    $targetPath = Join-Path $targetFolder ("test{0}.ext" -f $i)
    Copy-Item -Path $sourceFile -Destination $targetPath
}
Write-Host "Dateien von $Start bis $End wurden erfolgreich generiert im Ordner '$targetFolder'."
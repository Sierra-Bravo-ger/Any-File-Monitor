# Sicheres Netzlaufwerk-Mounting mit verschlüsseltem Passwort
# 1. Passwort einmalig verschlüsseln: (Zeile 3 unverändert Ausführen in PowerShell)
#    Read-Host "Passwort zum Verschlüsseln eingeben" -AsSecureString | ConvertFrom-SecureString | Out-File ".\pass_encrypted.txt"

# Konfiguration
$user = "USER"                          # Benutzername für die Freigabe
$serverShare = "\\SERVER\sharedfolder"  # UNC-Pfad zur Freigabe
$passFile = ".\pass_encrypted.txt"      # Datei mit verschlüsseltem Passwort
$driveLetter = "X:"                     # Laufwerk Buchstabe

# Passwort aus Datei lesen und entschlüsseln
$securePass = Get-Content $passFile | ConvertTo-SecureString
$cred = New-Object System.Management.Automation.PSCredential ($user, $securePass)

# SecureString -> Klartext (wird nur für net use benötigt und direkt verworfen)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($cred.Password)
$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
#
# Netzlaufwerk $driveletter verbinden mit cmd /c (damit net use wie gewohnt funktioniert)
#
cmd /c "net use $driveLetter $serverShare /user:$user $plain"

# Löscht das Passwort aus dem Arbeitsspeicher
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)  # Passwort aus Speicher löschen
# Einfaches GUI-Frontend fuer den HL7-Monitor (WinForms)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Formular erzeugen
$form = New-Object System.Windows.Forms.Form
$form.Text = "HL7 Monitor GUI"
$form.Size = New-Object System.Drawing.Size(400,200)
$form.StartPosition = "CenterScreen"

# Status-Label
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Bereit."
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(30, 120)
$form.Controls.Add($statusLabel)

# Start-Button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "Skript ausfuehren"
$startButton.Location = New-Object System.Drawing.Point(30, 30)
$startButton.Size = New-Object System.Drawing.Size(150,30)
$startButton.Add_Click({
    $statusLabel.Text = "Wird ausgefuehrt..."
    try {
        # Hier den Pfad zum HL7-Monitor-Skript anpassen:
        powershell.exe -ExecutionPolicy Bypass -File ".\hl7_monitor.ps1"
        $statusLabel.Text = "✅ Erfolgreich ausgefuehrt."
    } catch {
        $statusLabel.Text = "❌ Fehler: $($_.Exception.Message)"
    }
})
$form.Controls.Add($startButton)

# Konfigurations-Button
$configButton = New-Object System.Windows.Forms.Button
$configButton.Text = "Konfiguration bearbeiten"
$configButton.Location = New-Object System.Drawing.Point(200, 30)
$configButton.Size = New-Object System.Drawing.Size(150,30)
$configButton.Add_Click({
    # Pfad zur Konfigurationsdatei (config.ini) anpassen
    notepad.exe ".\config.ini"
})
$form.Controls.Add($configButton)

# GUI starten
$form.Topmost = $true
$form.Add_Shown({$form.Activate()})
[void]$form.ShowDialog()
# GUI-Elemente aufräumen
[System.Windows.Forms.Application]::Exit()
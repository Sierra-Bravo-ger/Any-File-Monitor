Option Explicit

' Skript zum Ausführen von PowerShell ohne Anzeige der Konsole
Dim objShell, strCommand

Set objShell = CreateObject("WScript.Shell")

' PowerShell-Skript mit verstecktem Fenster ausführen
strCommand = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "".\AnyFileMonitor.ps1"""

' 0 bedeutet Fenster verstecken
objShell.Run strCommand, 0, False

Set objShell = Nothing
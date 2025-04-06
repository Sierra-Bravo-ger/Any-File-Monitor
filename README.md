# AnyFileMonitor (AFM)

Ein konfigurierbares Tool zum Überwachen von Dateisystemen, das in verschiedenen API-Umgebungen eingesetzt werden kann. AnyFileMonitor hilft bei der Fehlerverfolgung und -behebung durch automatisierte Überwachung, Protokollierung und Benachrichtigung.

## [Demo-Showcase](https://afm.madmoench.de/) 

## Funktionen

### 1. Dateiüberwachung
- Überwacht mehrere Verzeichnisse (Eingang, Archiv, Fehler)
- Erkennt neue Dateien und Veränderungen
- Unterstützt verschiedene Dateitypen (.ext, .dat, .msg, .error, .hl7, .txt)
- Protokolliert Dateistatistiken in regelmäßigen Abständen

### 2. Fehleranalyse
- Erkennt Fehlermuster in Dateien mittels konfigurierbarer RegEx-Patterns
- Sammelt und speichert detaillierte Fehlerinformationen
- Protokolliert zugehörige Dateien für umfassende Problemanalyse
- Vermeidet Doppelverarbeitung durch Tracking bereits gesehener Fehler

### 3. Dashboards und Visualisierung
- [Dashboard Readme](https://github.com/Sierra-Bravo-ger/Any-File-Monitor/blob/main/docs/README.md)
- Interaktives HTML/JavaScript-Dashboard zur Überwachung in Echtzeit
- Grafische Darstellung von Fehlerraten, Mustererkennungen und Systemgesundheit
- Zeitbasierte Filterung zur gezielten Analyse bestimmter Zeiträume
- Automatische Vorfilterung der letzten 24 Stunden
- Lässt sich über lokalen Webserver ohne Internetverbindung betreiben

### 4. E-Mail-Benachrichtigungen
- Automatischer Versand von Benachrichtigungen bei erkannten Fehlermustern
- Konfigurierbare Schwellenwerte zur Vermeidung von Spam
- Unterstützt sichere SMTP-Verbindungen mit SSL/TLS
- Anpassbare Empfängerlisten und Betreffzeilen

### 5. Umfangreiche Konfigurationsmöglichkeiten
- Einstellbare Überwachungspfade und Dateifilter
- Anpassbare Fehlermuster für verschiedene Anwendungsfälle
- Konfigurierbare E-Mail-Einstellungen
- Einfache Wartung durch zentrale config.ini Datei

## Installation und Einrichtung

### Voraussetzungen
- Windows Betriebssystem
- PowerShell 5.1 oder höher
- Konfigurierte Verzeichnisstruktur für Eingabe, Archiv und Fehler

### Ordnerstruktur
```
LIS_Simulator/
├── INPUT/                       # Überwachtes Eingangsverzeichnis
├── ARCHIV/                      # Archivverzeichnis für verarbeitete Dateien
│   └── ERROR/                   # Verzeichnis für Fehlerdateien
└── AFMlog/                      # AnyFileMonitor Programmverzeichnis
    ├── AnyFileMonitor.ps1       # Hauptskript
    ├── config.ini               # Konfigurationsdatei
    ├── AFM_dashboard.html       # Dashboard
    ├── start-AFM-Dashboard.ps1  # Webserver für Dashboard
    ├── libs/                    # Lokale Bibliotheken für Dashboard
    │   ├── css/                 # css
    │   ├── js/                  # js
    │   └── fonts/               # fonts
    └── [Log-Dateien]            # CSV-Dateien mit Überwachungsdaten
```

### Konfiguration
Die Datei `config.ini` enthält alle wichtigen Einstellungen:

```ini
# Verzeichnispfade
inputPath=..\INPUT
archivPath=..\ARCHIV
errorPath=..\ARCHIV\ERROR

# Log-Dateien
AFMstatusLog=.\AFM_status_log.csv
AFMerrorLog=.\AFM_error_log.csv
AFMseenList=.\AFM_error_seen.txt
AFMinputDetailLog=.\AFM_input_details.csv

# Zu überwachende Dateitypen
fileExtensions=.ext,.dat,.msg,.error,.hl7,.txt

# RegEx-Ausdrücke für die Fehlersuche
errorPatterns=Timeout,Zeitüberschreitung,Verbindung vom peer,multiple Rows in singleton select,deadlock,lock conflict

# E-Mail-Konfiguration
emailEnabled=true
emailSmtpServer=smtp.example.com
emailSmtpPort=587
emailUseSSL=true
emailFrom=monitor@example.com
emailTo=admin@example.com
emailSubject=AnyFileMonitor - Fehler erkannt
emailUsername=username
emailPassword=password
emailMinPatternMatches=5
```

## Verwendung

### Automatische Ausführung
AnyFileMonitor kann als Windows-Aufgabe eingerichtet werden:
- Verwenden Sie die mitgelieferte XML-Vorlage `AnyFileMonitor_Task.xml`
- Importieren Sie diese in den Windows Task Scheduler
- Standard: Ausführung alle 5 Minuten

### Dashboard starten
```powershell
# Zum Programmverzeichnis wechseln
cd C:\Transfer\LIS_Simulator\AFMlog

# Dashboard-Server starten
.\start-AFM-Dashboard.ps1
```

Das Dashboard ist dann unter http://localhost:8080/AFM_dashboard.html verfügbar.

### Manuelle Testausführung
```powershell
# Einzelne Ausführung des Monitors
.\AnyFileMonitor.ps1

# Ausführung des Testskripts für umfassende Tests
.\Test-AFM.ps1
```

## Log-Dateien

### Status-Log (AFM_status_log.csv)
Enthält allgemeine Statistiken über die Anzahl der Dateien in den überwachten Verzeichnissen.
![Status-Log Screenshot](/images/hl7_status_log.png)

### Fehler-Log (AFM_error_log.csv)
Detaillierte Informationen über erkannte Fehler und die zugehörigen Dateien.
![hl7_error_log](https://github.com/user-attachments/assets/fea8e22a-6a9e-4281-8398-f41bab24fb40)

### Pattern-Matches (AFM_pattern_matches.csv)
Erfasst erkannte Fehlermuster und zugehörige Dateien für die Analyse.

### Input-Details (AFM_input_details.csv)
Protokolliert Informationen über Eingangsdateien für die Nachverfolgung.

## Dashboard-Funktionen

Das Dashboard bietet folgende Ansichten:
- **Übersicht**: Allgemeine Systemgesundheit, KPIs und zusammenfassende Grafiken
- **Status**: Verlauf der Dateistatus in allen Verzeichnissen
- **Analyse**: Fehlertrend-Diagramme und Verarbeitungseffizienz 
- **Fehler**: Detaillierte Fehlerlogdaten mit Suchfunktion
- **Muster**: Erkannte Fehlermuster in den überwachten Dateien
- **Eingangsdaten**: Details zu den Eingangsdateien

Besondere Funktionen:
- Zeitraumfilter (voreingestellt: letzte 24 Stunden)
- Automatische Aktualisierung alle 60 Sekunden
- Erkennung und farbliche Hervorhebung bekannter Fehlermuster
- Berechnung von KPIs wie MTBF (Mean Time Between Failures)

## Fehlerbehebung

- **Dashboard zeigt keine Daten an**: Prüfen Sie, ob die CSV-Dateien korrekt erstellt werden
- **E-Mail-Versand funktioniert nicht**: Überprüfen Sie die SMTP-Einstellungen in der config.ini
- **Fehlermuster werden nicht erkannt**: Stellen Sie sicher, dass die RegEx-Patterns in der config.ini korrekt sind
- **Webserver-Probleme**: Bei Port-Konflikten wählt der Server automatisch einen freien Port

## Lizenz

Dieses Projekt ist für die interne Verwendung bestimmt und unterliegt keiner spezifischen Open-Source-Lizenz.

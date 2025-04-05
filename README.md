# Any-File-Monitor
HL7 File Monitor - Monitors Directories, used by different APIs to process Files. Should help with Error tracking and resolving.

## Example for Folder Structure

$basedir/
├─ INPUT/
├─ ARCHIV/
│  ├─ ERROR/
├─ AFMlog/


## Example Status Log
Counts files inside directories

![Status-Log Screenshot](/images/hl7_status_log.png)
## Example Error Log
Outputs file content of .error and .hl7 files inside ERROR directory, if age of File is > 1 Minute

![hl7_error_log](https://github.com/user-attachments/assets/fea8e22a-6a9e-4281-8398-f41bab24fb40)

param(
  [int]$IntervalMinutes = 10
)

$root = Split-Path -Parent $PSCommandPath
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$taskName = 'Amul Stock Monitor'
$action = New-ScheduledTaskAction -Execute $npm -Argument 'run check' -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At (Get-Date).AddMinutes(1)
$trigger.Repetition.Interval = "PT$IntervalMinutes`M"
$trigger.Repetition.Duration = 'P1D'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Checks Amul whey protein availability and sends Telegram alerts.' -Force
Write-Host "Registered '$taskName' to run every $IntervalMinutes minutes."

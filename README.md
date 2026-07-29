# Amul whey stock monitor

Monitors **Amul Chocolate Whey Protein, 34 g | Pack of 30 sachets** for pincode `122002` and sends a Telegram message when it becomes available.

## Setup

1. Install dependencies and the Chromium browser:

   ```powershell
   npm.cmd install
   npx.cmd playwright install chromium
   ```

2. The local `.env` file holds the pincode and Telegram credentials. It is ignored by Git. Do not commit or share it.

## Run

Run one check:

```powershell
npm.cmd run check
```

Verify Telegram delivery (sends a real message):

```powershell
npm.cmd run test-alert
```

Keep it running in the current terminal:

```powershell
npm.cmd run watch
```

Register a Windows scheduled task that runs a check every 10 minutes:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\register-task.ps1
```

The monitor remembers the previous status in `.data/state.json`, so it only alerts when availability changes from unavailable to available. Delete that file if you want the next available check to alert again.

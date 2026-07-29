import 'dotenv/config';
import { spawn } from 'node:child_process';

const minutes = Number(process.env.CHECK_INTERVAL_MINUTES ?? 10);
const intervalMs = Math.max(minutes, 5) * 60_000;

function runCheck() {
  const child = spawn(process.execPath, ['src/check-stock.js'], { stdio: 'inherit' });
  child.on('error', (error) => console.error(error));
}

runCheck();
setInterval(runCheck, intervalMs);

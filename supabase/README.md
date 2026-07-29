# AmulBot Supabase services

Everything for this app is namespaced with `amulbot`:

- Database schema: `amulbot`
- Edge Functions: `amulbot-create-alert`, `amulbot-telegram-webhook`, and `amulbot-record-availability`
- Cron job: `amulbot_trigger_github_worker`

Set these Edge Function secrets in the Supabase dashboard before enabling the public site:

`TELEGRAM_BOT_TOKEN`, `AMULBOT_TELEGRAM_WEBHOOK_SECRET`, `AMULBOT_WORKER_SECRET`, `AMULBOT_TELEGRAM_BOT_USERNAME`, and `AMULBOT_APP_ORIGIN`.

select cron.unschedule(jobid)
from cron.job
where jobname = 'amulbot_expire_pending_alerts';

select cron.schedule(
  'amulbot_expire_pending_alerts',
  '17 * * * *',
  $$
    update amulbot.alerts
    set status = 'deleted', connection_code = null
    where status = 'pending'
      and created_at < now() - interval '24 hours';
  $$
);

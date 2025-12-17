create table nudge_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  subscription_id uuid references trip_subscriptions(id),
  message_type text, -- 'delay_alert', 'crowd_alert'
  message_content jsonb,
  delivered_via text, -- 'line'
  triggered_at timestamptz default now()
);

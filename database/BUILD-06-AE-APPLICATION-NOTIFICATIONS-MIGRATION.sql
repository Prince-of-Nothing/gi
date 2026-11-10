-- GidiReads Build 6: AE application status, appointment dates and in-app notifications.
-- Apply only after the current website package has been deployed and the earlier Build 4 migration exists.

alter table public.ae_applications
  add column if not exists contract_start date,
  add column if not exists contract_end date;

create or replace function public.notify_ae_application_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_message text;
  v_link text := 'ae-apply.html';
begin
  if tg_op = 'INSERT' then
    v_message := 'Your AE application has been submitted and is now awaiting review.';
  elsif new.status is distinct from old.status then
    if new.status = 'approved' then
      v_message := 'Your application as an Acquisitions & Developmental Editor has been approved! Open your AE workspace for the next steps.';
      v_link := 'ae.html';
    elsif new.status = 'rejected' then
      v_message := 'There is an update on your AE application. Open the application page to read the team’s note.';
    else
      v_message := 'Your AE application is still in review. The team will update you when there is a decision.';
    end if;
  else
    return new;
  end if;

  insert into public.notifications(user_id, message, link, category)
  values (new.user_id, v_message, v_link, 'system');
  return new;
end;
$$;

revoke all on function public.notify_ae_application_change() from public, anon, authenticated;
drop trigger if exists ae_application_notify_insert on public.ae_applications;
drop trigger if exists ae_application_notify_status on public.ae_applications;
create trigger ae_application_notify_insert
after insert on public.ae_applications
for each row execute function public.notify_ae_application_change();
create trigger ae_application_notify_status
after update of status on public.ae_applications
for each row execute function public.notify_ae_application_change();

notify pgrst, 'reload schema';

create or replace function public.admin_set_ae_contract_period(p_application_id uuid,p_start date,p_end date)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare v_user uuid;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then
    raise exception 'not_authorized';
  end if;
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid_contract_period';
  end if;
  update public.ae_applications
  set contract_start=p_start,contract_end=p_end,updated_at=now()
  where id=p_application_id and status='approved'
  returning user_id into v_user;
  if v_user is null then raise exception 'approved_application_not_found'; end if;
  insert into public.notifications(user_id,message,link,category)
  values(v_user,'Your AE contract period has been added to your appointment details. Open your AE workspace to view it.','ae.html','system');
  return jsonb_build_object('success',true,'user_id',v_user);
end;
$$;
revoke all on function public.admin_set_ae_contract_period(uuid,date,date) from public,anon;
grant execute on function public.admin_set_ae_contract_period(uuid,date,date) to authenticated;

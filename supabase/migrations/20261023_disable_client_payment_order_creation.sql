-- GidiReads payments are intentionally disabled until the payment service provider is selected.
-- Keep order creation restricted to trusted server-side service_role operations.
revoke execute on function public.gidireads_wallet_create_payment_order(uuid,text,text,text,bigint,text,text,bigint,text) from public, anon, authenticated;

-- =========================================================================
-- 0043_tax_payment_settings_seed.sql
-- Seeds system_settings keys for the Taxes and Payment Settings admin pages.
-- Reuses the existing generic system_settings key/value store rather than
-- new tables. Sensitive keys (gateway secrets) are only ever readable by
-- super_admin via the existing system_settings_super_admin_all policy —
-- they are not in the publicly-readable branding key set.
-- =========================================================================

insert into public.system_settings (key, value, description) values
  ('gst_enabled', 'false', 'Whether GST/VAT is applied to invoices'),
  ('gst_percentage', '18', 'GST/VAT percentage applied to invoices'),
  ('tax_registration_number', '""', 'Business tax/GST registration number shown on invoices'),
  ('prices_include_tax', 'false', 'Whether displayed plan prices already include tax')
on conflict (key) do nothing;

insert into public.system_settings (key, value, description) values
  ('payment_gateway_active', '"manual"', 'Active payment gateway: razorpay, stripe, or manual'),
  ('razorpay_key_id', '""', 'Razorpay public key ID'),
  ('razorpay_key_secret', '""', 'Razorpay secret key (super admin only)'),
  ('razorpay_webhook_secret', '""', 'Razorpay webhook signing secret (super admin only)'),
  ('stripe_publishable_key', '""', 'Stripe publishable key'),
  ('stripe_secret_key', '""', 'Stripe secret key (super admin only)'),
  ('manual_payment_instructions', '""', 'Instructions shown to organizers paying manually (e.g. bank transfer details)')
on conflict (key) do nothing;

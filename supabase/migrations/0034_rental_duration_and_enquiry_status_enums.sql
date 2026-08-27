-- =========================================================================
-- 0034_rental_duration_and_enquiry_status_enums.sql
-- =========================================================================
alter type rental_duration add value if not exists '3_month';
alter type rental_duration add value if not exists '6_month';
alter type rental_duration add value if not exists '1_year';
alter type rental_duration add value if not exists 'custom';

alter type enquiry_status add value if not exists 'payment_pending';
alter type enquiry_status add value if not exists 'approved';
alter type enquiry_status add value if not exists 'rejected';
alter type enquiry_status add value if not exists 'cancelled';
alter type enquiry_status add value if not exists 'expired';

alter type payment_status add value if not exists 'cancelled';
alter type payment_status add value if not exists 'manual';

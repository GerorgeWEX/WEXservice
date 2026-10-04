-- Smoke test: extensions and enums exist (M0)
begin;
select plan(4);
select has_extension('pg_trgm');
select has_extension('citext');
select is(public.unaccent_immutable('ăâîșț'), 'aaist', 'unaccent_immutable strips Romanian diacritics');
select enum_has_labels('public', 'user_role', array['admin','subadmin','technician','client']);
select * from finish();
rollback;

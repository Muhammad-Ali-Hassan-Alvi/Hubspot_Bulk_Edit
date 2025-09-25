create table "public"."test_table" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null
);


CREATE UNIQUE INDEX test_table_pkey ON public.test_table USING btree (id);

alter table "public"."test_table" add constraint "test_table_pkey" PRIMARY KEY using index "test_table_pkey";

grant delete on table "public"."test_table" to "anon";

grant insert on table "public"."test_table" to "anon";

grant references on table "public"."test_table" to "anon";

grant select on table "public"."test_table" to "anon";

grant trigger on table "public"."test_table" to "anon";

grant truncate on table "public"."test_table" to "anon";

grant update on table "public"."test_table" to "anon";

grant delete on table "public"."test_table" to "authenticated";

grant insert on table "public"."test_table" to "authenticated";

grant references on table "public"."test_table" to "authenticated";

grant select on table "public"."test_table" to "authenticated";

grant trigger on table "public"."test_table" to "authenticated";

grant truncate on table "public"."test_table" to "authenticated";

grant update on table "public"."test_table" to "authenticated";

grant delete on table "public"."test_table" to "service_role";

grant insert on table "public"."test_table" to "service_role";

grant references on table "public"."test_table" to "service_role";

grant select on table "public"."test_table" to "service_role";

grant trigger on table "public"."test_table" to "service_role";

grant truncate on table "public"."test_table" to "service_role";

grant update on table "public"."test_table" to "service_role";



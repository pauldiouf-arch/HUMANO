```sql
create table if not exists postes (
  id text primary key,
  statut text not null,
  creeLe text not null,
  majLe text not null,
  donnees text not null
);

create table if not exists tests (
  id text primary key,
  posteId text not null,
  statut text not null,
  debut text not null,
  finPrevue text not null,
  jetonHash text not null,
  donnees text not null
);

create table if not exists journal (
  n bigserial primary key,
  horodatage text not null,
  acteur text not null,
  action text not null,
  cible text not null,
  detail text not null,
  empreinte text not null
);

create table if not exists proprietes (
  cle text primary key,
  valeur text not null
);

alter table postes enable row level security;
alter table tests enable row level security;
alter table journal enable row level security;
alter table proprietes enable row level security;
```

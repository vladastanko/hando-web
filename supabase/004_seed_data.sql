-- ============================================================
-- HANDOO — Seed Data
-- 50 realistic Serbian profiles + 50 real local jobs
-- Run AFTER your schema SQL files (001, 002)
-- ============================================================

-- ─── HELPER: Create auth users and profiles ──────────────────
-- NOTE: In Supabase you cannot insert directly into auth.users via SQL easily.
-- The cleanest approach is to insert only into `profiles` with fake UUIDs
-- for demo/testing. For production seeding use Supabase Admin API or
-- run this as a migration with proper auth.users inserts.

-- We'll use explicit UUIDs for all seed profiles so they're stable.

-- ─── SEED PROFILES ───────────────────────────────────────────
INSERT INTO profiles (
  id, email, full_name, city, bio, role, credits,
  rating_as_worker, rating_as_poster,
  total_ratings_worker, total_ratings_poster,
  completed_jobs_worker, completed_jobs_poster,
  verification_status, is_email_verified, is_phone_verified,
  total_earnings,
  created_at, updated_at
) VALUES
-- Novi Sad area
('a1000001-0000-0000-0000-000000000001','marko.jovic@email.rs','Marko Jović','Novi Sad','Iskusan fizički radnik, dostupan vikendima i po potrebi tokom nedelje. Imam sopstveni alat.','both',45,4.8,4.7,14,9,18,11,'verified',true,true,94500,'2024-09-15','2025-02-10'),
('a1000002-0000-0000-0000-000000000002','ana.petrovic@email.rs','Ana Petrović','Novi Sad','Pružam usluge čišćenja i održavanja domaćinstava. Pedantna i pouzdana.','worker',32,4.9,0,22,0,22,0,'verified',true,true,115000,'2024-08-20','2025-02-15'),
('a1000003-0000-0000-0000-000000000003','stefan.nikolic@email.rs','Stefan Nikolić','Novi Sad','Elektricar sa 8 god iskustva, sve vrste elektroinstalacija.','both',60,4.7,4.5,11,6,14,7,'verified',true,false,78000,'2024-10-01','2025-01-20'),
('a1000004-0000-0000-0000-000000000004','milica.savic@email.rs','Milica Savić','Petrovaradin','Studentkinja, dostupna za laku pomoć, dostave, čuvanje dece i kućnih ljubimaca.','worker',18,4.6,0,8,0,8,0,'unverified',true,false,28000,'2024-11-10','2025-02-01'),
('a1000005-0000-0000-0000-000000000005','nemanja.djordjevic@email.rs','Nemanja Đorđević','Novi Sad','Moler i gipsar, radim kvalitetno i brzo. Reference po zahtevu.','both',75,4.9,4.8,19,12,21,13,'verified',true,true,142000,'2024-07-05','2025-02-18'),

-- Beograd area
('a1000006-0000-0000-0000-000000000006','jovana.markovic@email.rs','Jovana Marković','Beograd','Vrtlarka sa iskustvom u uređenju bašti i balkona. Posle posla i vikendom.','worker',25,4.7,0,13,0,13,0,'verified',true,true,65000,'2024-09-01','2025-02-05'),
('a1000007-0000-0000-0000-000000000007','milan.stojanovic@email.rs','Milan Stojanović','Beograd','Dostavljam pošiljke i namirnice po Beogradu. Imam kombi vozilo.','both',90,4.8,4.6,27,8,30,9,'verified',true,true,198000,'2024-06-15','2025-02-20'),
('a1000008-0000-0000-0000-000000000008','nina.ilic@email.rs','Nina Ilić','Beograd','Nudim usluge nege starijih osoba, iskustvo 4 godine.','worker',15,5.0,0,18,0,18,0,'verified',true,true,89000,'2024-08-10','2025-01-30'),
('a1000009-0000-0000-0000-000000000009','aleksa.pavlovic@email.rs','Aleksa Pavlović','Zemun','Vodoinstalater, brze intervencije i renoviranje kupatila.','both',55,4.6,4.4,9,5,10,6,'verified',true,false,72000,'2024-10-20','2025-02-12'),
('a1000010-0000-0000-0000-000000000010','tamara.ristic@email.rs','Tamara Ristić','Beograd','Čistim stanove, kuće i poslovne prostore. Dostupna svaki dan.','worker',38,4.8,0,31,0,31,0,'verified',true,true,162000,'2024-07-25','2025-02-22'),

-- Niš area
('a1000011-0000-0000-0000-000000000011','vladislav.zdravkovic@email.rs','Vladislav Zdravković','Niš','Selidbeni radnik sa iskustvom. Imam i pomagače koji mi pomažu.','both',42,4.7,4.9,16,20,17,22,'verified',true,true,104000,'2024-09-05','2025-02-08'),
('a1000012-0000-0000-0000-000000000012','sanja.dimitrijevic@email.rs','Sanja Dimitrijević','Niš','Frizer, radim i kućne posete za starije i nepokretne.','worker',20,4.9,0,11,0,11,0,'unverified',true,false,44000,'2024-11-01','2025-01-25'),
('a1000013-0000-0000-0000-000000000013','bojan.stankovic@email.rs','Bojan Stanković','Niška Banja','Majstor za sve — sitni popravci, montirani nameštaj, keramika.','both',65,4.8,4.7,23,14,25,15,'verified',true,true,131000,'2024-08-01','2025-02-17'),
('a1000014-0000-0000-0000-000000000014','vesna.milosevic@email.rs','Vesna Milošević','Niš','Čuvam decu, imam pedagoško obrazovanje, reference dostupne.','worker',12,5.0,0,9,0,9,0,'verified',true,true,36000,'2024-10-15','2025-02-03'),
('a1000015-0000-0000-0000-000000000015','dragan.petrovic@email.rs','Dragan Petrović','Niš','Elektricar, klima uređaji, video nadzor.','both',48,4.5,4.6,8,7,9,8,'verified',true,false,59000,'2024-09-20','2025-01-18'),

-- Kragujevac
('a1000016-0000-0000-0000-000000000016','maja.lukic@email.rs','Maja Lukić','Kragujevac','Peračica i peglarica, dolazim na adresu.','worker',22,4.8,0,15,0,15,0,'unverified',true,false,52000,'2024-10-05','2025-02-06'),
('a1000017-0000-0000-0000-000000000017','zoran.jankovic@email.rs','Zoran Janković','Kragujevac','Automehaničar i detailer, dolazim na lokaciju.','both',80,4.7,4.8,17,10,19,11,'verified',true,true,118000,'2024-08-15','2025-02-19'),
('a1000018-0000-0000-0000-000000000018','lena.vucic@email.rs','Lena Vučić','Kragujevac','Instruktor matematike i fizike, dolazim ili online.','worker',28,5.0,0,12,0,12,0,'verified',true,true,62000,'2024-09-25','2025-01-28'),
('a1000019-0000-0000-0000-000000000019','igor.todorovic@email.rs','Igor Todorović','Kragujevac','Vrtlar i kosilac, sezonski radovi, zaštita bilja.','both',35,4.6,4.5,10,6,11,7,'unverified',true,false,45000,'2024-11-05','2025-02-01'),
('a1000020-0000-0000-0000-000000000020','biljana.neskovic@email.rs','Biljana Nešković','Kragujevac','Negovanje starijih, iskustvo u palijativnoj nezi.','worker',18,4.9,0,14,0,14,0,'verified',true,true,74000,'2024-10-10','2025-02-14'),

-- Subotica
('a1000021-0000-0000-0000-000000000021','tibor.kiss@email.rs','Tibor Kiss','Subotica','Moler i soboslikar, precizna priprema površina.','both',52,4.7,4.6,13,8,14,9,'verified',true,false,87000,'2024-09-10','2025-02-09'),
('a1000022-0000-0000-0000-000000000022','andrea.horvath@email.rs','Andrea Horváth','Subotica','Čišćenje i organizacija prostora, Marie Kondo metod.','worker',30,4.8,0,17,0,17,0,'verified',true,true,85000,'2024-08-25','2025-02-16'),
('a1000023-0000-0000-0000-000000000023','laszlo.szabo@email.rs','László Szabó','Subotica','Vozač dostave, poznajem oblast Vojvodine odlično.','both',45,4.6,4.7,9,11,10,12,'unverified',true,false,68000,'2024-10-25','2025-01-22'),
('a1000024-0000-0000-0000-000000000024','eniko.varga@email.rs','Enikő Varga','Subotica','Čuvanje dece, engleski jezik, kreativne aktivnosti.','worker',16,4.9,0,8,0,8,0,'verified',true,true,34000,'2024-11-15','2025-02-04'),
('a1000025-0000-0000-0000-000000000025','marijan.bogdanovic@email.rs','Marijan Bogdanović','Palić','Farmer koji može da pomogne oko selidbi i baštenskih radova.','both',28,4.5,4.4,7,5,8,6,'unverified',true,false,38000,'2024-10-30','2025-01-15'),

-- Novi Pazar / Raška
('a1000026-0000-0000-0000-000000000026','emir.husovic@email.rs','Emir Hušović','Novi Pazar','Fizički radnik, selidbe, utovari, skladišni poslovi.','worker',20,4.6,0,10,0,10,0,'unverified',true,false,42000,'2024-09-30','2025-01-10'),
('a1000027-0000-0000-0000-000000000027','fatima.tahirovic@email.rs','Fatima Tahirović','Novi Pazar','Čišćenje i kućne usluge, tačna i marljiva.','worker',14,4.8,0,7,0,7,0,'unverified',true,false,30000,'2024-11-20','2025-02-02'),

-- Čačak / Šumadija
('a1000028-0000-0000-0000-000000000028','goran.milovanovic@email.rs','Goran Milovanović','Čačak','Gradjevinski radnik, armatura, iskopavanja, beton.','both',60,4.7,4.6,15,9,17,10,'verified',true,true,112000,'2024-08-05','2025-02-11'),
('a1000029-0000-0000-0000-000000000029','slavica.arsenijevic@email.rs','Slavica Arsenijević','Čačak','Spremačica, peglanje, nega starijih, kuvanje.','worker',24,4.8,0,19,0,19,0,'verified',true,false,79000,'2024-09-08','2025-02-07'),
('a1000030-0000-0000-0000-000000000030','predrag.stevanovic@email.rs','Predrag Stevanović','Gornji Milanovac','Tesar, montaža tavan prostora, pergola, ograde.','both',70,4.9,4.8,22,13,24,14,'verified',true,true,154000,'2024-07-20','2025-02-21'),

-- Smederevo / Podunavlje
('a1000031-0000-0000-0000-000000000031','borivoje.ninkovic@email.rs','Borivoje Ninković','Smederevo','Vodoinstalater i grejanje, hitne intervencije 0-24.','both',55,4.7,4.5,12,7,13,8,'verified',true,false,81000,'2024-09-15','2025-01-28'),
('a1000032-0000-0000-0000-000000000032','natasa.cerovic@email.rs','Nataša Čerović','Smederevo','Čišćenje poslovnih i stambenih prostora, flex.','worker',26,4.6,0,11,0,11,0,'unverified',true,false,46000,'2024-10-18','2025-01-19'),

-- Šabac / Mačva
('a1000033-0000-0000-0000-000000000033','milan.simic@email.rs','Milan Simić','Šabac','Elektricar i PV sistemi, solarni paneli.','both',85,4.8,4.7,14,9,15,10,'verified',true,true,101000,'2024-08-20','2025-02-13'),
('a1000034-0000-0000-0000-000000000034','jelena.filipovic@email.rs','Jelena Filipović','Šabac','Frizura i uljepšavanje uz kućne posete.','worker',18,5.0,0,10,0,10,0,'unverified',true,false,42000,'2024-11-08','2025-02-05'),

-- Vranje / Pčinja
('a1000035-0000-0000-0000-000000000035','zivota.milenkovic@email.rs','Života Milenković','Vranje','Poljoprivrednik, radovi na terenu, branje voća/povrća.','both',22,4.5,4.4,8,6,9,7,'unverified',true,false,35000,'2024-10-05','2025-01-12'),
('a1000036-0000-0000-0000-000000000036','svetlana.pavic@email.rs','Svetlana Pavić','Vranje','Čuvanje dece i starijih, kuvanje, kućne usluge.','worker',12,4.7,0,6,0,6,0,'unverified',true,false,27000,'2024-11-25','2025-02-03'),

-- Leskovac / Jablanica
('a1000037-0000-0000-0000-000000000037','dusan.lazarevic@email.rs','Dušan Lazarević','Leskovac','Moler, gips, rigips, spoljašnje fasade.','both',48,4.7,4.6,16,10,18,11,'verified',true,false,99000,'2024-09-01','2025-02-09'),
('a1000038-0000-0000-0000-000000000038','dragana.cosic@email.rs','Dragana Ćosić','Leskovac','Sprema domove i firme, sa sopstvenim sredstvima.','worker',20,4.8,0,13,0,13,0,'unverified',true,false,55000,'2024-10-12','2025-01-30'),

-- Valjevo / Kolubara
('a1000039-0000-0000-0000-000000000039','aleksandar.obradovic@email.rs','Aleksandar Obradović','Valjevo','Bravar, metalna vrata, ograde, ograđivanje terena.','both',65,4.6,4.7,11,8,12,9,'verified',true,true,76000,'2024-09-22','2025-02-06'),
('a1000040-0000-0000-0000-000000000040','gordana.djukic@email.rs','Gordana Đukić','Valjevo','Masaža i relaksacija, dolazim na adresu.','worker',16,4.9,0,9,0,9,0,'unverified',true,false,39000,'2024-11-03','2025-02-01'),

-- Kruševac / Rasina
('a1000041-0000-0000-0000-000000000041','miroslav.antic@email.rs','Miroslav Antić','Kruševac','Vodoinstalater i kerameičar, čista i precizna izrada.','both',58,4.8,4.7,18,11,20,12,'verified',true,true,125000,'2024-08-10','2025-02-17'),
('a1000042-0000-0000-0000-000000000042','snezana.vujanovic@email.rs','Snežana Vujanović','Kruševac','Starateljka starijih osoba, iskustvo u medicinskoj nezi.','worker',14,5.0,0,15,0,15,0,'verified',true,true,71000,'2024-09-18','2025-02-10'),

-- Zaječar / Timočka Krajina
('a1000043-0000-0000-0000-000000000043','radiša.vasic@email.rs','Radiša Vasić','Zaječar','Fizički radnik, selidbe i utovar, imam kamion.','both',35,4.6,4.5,10,7,11,8,'unverified',true,false,62000,'2024-10-08','2025-01-24'),
('a1000044-0000-0000-0000-000000000044','ivana.zivkovic@email.rs','Ivana Živković','Zaječar','Čišćenje i kućne usluge, diskretna i pedantna.','worker',18,4.7,0,8,0,8,0,'unverified',true,false,33000,'2024-11-18','2025-02-02'),

-- Požarevac / Braničevo
('a1000045-0000-0000-0000-000000000045','slobodan.popovic@email.rs','Slobodan Popović','Požarevac','Elektricar i vodoinstalater kombinovano, sve urađeno na vreme.','both',72,4.7,4.8,13,9,14,10,'verified',true,false,91000,'2024-09-05','2025-02-14'),

-- Pančevo / Banat
('a1000046-0000-0000-0000-000000000046','milorad.bulatovic@email.rs','Milorad Bulatović','Pančevo','Moler, ukrasne zidne tehnike, venetian plaster.','both',56,4.8,4.7,14,8,15,9,'verified',true,true,97000,'2024-08-28','2025-02-16'),
('a1000047-0000-0000-0000-000000000047','vera.todorov@email.rs','Vera Todorov','Pančevo','Čišćenje, pranje prozora, pranje tepiha.','worker',22,4.7,0,16,0,16,0,'unverified',true,false,67000,'2024-09-28','2025-02-08'),

-- Kikinda / Sever Banata
('a1000048-0000-0000-0000-000000000048','hunor.nagy@email.rs','Hunor Nagy','Kikinda','Svakodnevni majstorski poslovi, sve vrste popravki.','both',40,4.6,4.5,9,6,10,7,'unverified',true,false,48000,'2024-10-22','2025-01-20'),

-- Zrenjanin
('a1000049-0000-0000-0000-000000000049','srdjan.miric@email.rs','Srđan Mirić','Zrenjanin','Vozač kombija, selidbe, dostave, Vojvodina i Beograd.','both',50,4.8,4.7,20,12,22,13,'verified',true,true,138000,'2024-08-08','2025-02-20'),
('a1000050-0000-0000-0000-000000000050','lidija.krstic@email.rs','Lidija Krstić','Zrenjanin','Čišćenje domaćinstava i firmi, iskusna i brza.','worker',28,4.8,0,18,0,18,0,'verified',true,false,81000,'2024-09-12','2025-02-15')

ON CONFLICT (id) DO NOTHING;


-- ─── SEED CATEGORIES (ensure they exist) ─────────────────────
INSERT INTO categories (id, name, icon, color) VALUES
('c0000001-0000-0000-0000-000000000001','Selidbe','📦','#4F7CFF'),
('c0000002-0000-0000-0000-000000000002','Montaža nameštaja','🪑','#7C3AED'),
('c0000003-0000-0000-0000-000000000003','Čišćenje','🧹','#0EA5E9'),
('c0000004-0000-0000-0000-000000000004','Dostava','🚚','#F59E0B'),
('c0000005-0000-0000-0000-000000000005','Majstor / Popravke','🔧','#EF4444'),
('c0000006-0000-0000-0000-000000000006','Molersko-fasadni','🖌','#EC4899'),
('c0000007-0000-0000-0000-000000000007','Baštovanstvo','🌿','#22C55E'),
('c0000008-0000-0000-0000-000000000008','Nega kućnih ljubimaca','🐾','#F97316'),
('c0000009-0000-0000-0000-000000000009','Nega starijih','🤝','#8B5CF6'),
('c0000010-0000-0000-0000-000000000010','Čuvanje dece','👶','#06B6D4'),
('c0000011-0000-0000-0000-000000000011','Pomoć na eventi','🎉','#F43F5E'),
('c0000012-0000-0000-0000-000000000012','Skladište / Utovari','🏭','#64748B'),
('c0000013-0000-0000-0000-000000000013','Građevina','🏗','#D97706'),
('c0000014-0000-0000-0000-000000000014','Elektroinst.','⚡','#EAB308'),
('c0000015-0000-0000-0000-000000000015','Vodoinstalacije','🔩','#0284C7'),
('c0000016-0000-0000-0000-000000000016','Pranje auta','🚗','#10B981'),
('c0000017-0000-0000-0000-000000000017','Lepota / Frizerstvo','✂️','#DB2777'),
('c0000018-0000-0000-0000-000000000018','Instrukcije','📚','#7C3AED'),
('c0000019-0000-0000-0000-000000000019','Kancelarija / Admin','💼','#6366F1'),
('c0000020-0000-0000-0000-000000000020','Ostalo','📋','#6B7280')
ON CONFLICT (id) DO NOTHING;


-- ─── SEED JOBS ────────────────────────────────────────────────
-- 50 realistic jobs spread across Serbia, posted by seed users
-- Scheduled dates are 1-3 weeks from a reference date

INSERT INTO jobs (
  id, poster_id, title, description, category_id,
  address, city,
  location,
  scheduled_date, duration_hours, pay_per_worker, crew_size, accepted_workers,
  status, credits_spent, created_at, updated_at
) VALUES

-- Novi Sad (10 jobs)
('j0000001-0000-0000-0000-000000000001','a1000001-0000-0000-0000-000000000001',
'Selidba stana u Novom Sadu — 2. sprat bez lifta',
'Selidba jednospratnog stana ~60m2. Imate liftove? Ne. Potrebna su 2-3 snažna momka. Imamo kombi, treba samo fizička pomoć. Kreće se sa Bulevara Oslobođenja.',
'c0000001-0000-0000-0000-000000000001','Bulevar Oslobođenja','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8444, 45.2671), 4326),
'2025-03-25 09:00:00',5,3500,3,1,'open',10,'2025-03-10','2025-03-10'),

('j0000002-0000-0000-0000-000000000002','a1000005-0000-0000-0000-000000000005',
'Krečenje dnevne sobe i hodnika',
'Potrebno kreisanje dnevne sobe (~25m2) i hodnika (~8m2). Zidovi su ravni, samo treba dva sloja kreča. Boja se kupuje od strane poslodavca.',
'c0000006-0000-0000-0000-000000000006','Futoška ulica','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8330, 45.2550), 4326),
'2025-03-22 08:00:00',6,4000,2,0,'open',10,'2025-03-11','2025-03-11'),

('j0000003-0000-0000-0000-000000000003','a1000003-0000-0000-0000-000000000003',
'Generalno čišćenje stana posle renoviranja',
'Stan posle renoviranja ~70m2. Sve je prašnjavo, treba prvo usisavanje, pa mokro čišćenje. Imamo sredstva za čišćenje, tražimo samo radnike.',
'c0000003-0000-0000-0000-000000000003','Kisačka ulica','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8510, 45.2720), 4326),
'2025-03-20 10:00:00',4,2500,2,2,'in_progress',10,'2025-03-12','2025-03-13'),

('j0000004-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000001',
'Montaža kuhinjskih elemenata IKEA',
'Kupili smo IKEA kuhinju, treba montirati. ~15 elemenata, šine, police, vrata. Sve je pripremljeno, treba monter sa iskustvom.',
'c0000002-0000-0000-0000-000000000002','Rumenačka put','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8200, 45.2600), 4326),
'2025-03-28 09:00:00',5,5000,1,0,'open',10,'2025-03-13','2025-03-13'),

('j0000005-0000-0000-0000-000000000005','a1000005-0000-0000-0000-000000000005',
'Uređenje dvorišta — košenje i čišćenje',
'Dvorište ~200m2, trava porasla 40cm. Treba kositi, skupiti travu i srediti ivičnjake. Imamo mašinu za košenje.',
'c0000007-0000-0000-0000-000000000007','Mišeluk','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8900, 45.2490), 4326),
'2025-03-23 08:00:00',3,2000,2,0,'open',10,'2025-03-14','2025-03-14'),

('j0000006-0000-0000-0000-000000000006','a1000003-0000-0000-0000-000000000003',
'Postavljanje keramike u kupatilu',
'Kupatilo ~8m2, treba postaviti podnu keramiku. Ploče su kupljene 60x60. Tražimo iskusnog keramičara.',
'c0000005-0000-0000-0000-000000000005','Cara Lazara','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8350, 45.2530), 4326),
'2025-03-27 08:00:00',8,8000,1,0,'open',10,'2025-03-10','2025-03-10'),

('j0000007-0000-0000-0000-000000000007','a1000004-0000-0000-0000-000000000004',
'Čuvanje psa vikendom — Labradorka',
'Putujem vikendom, treba mi neko ko može da čuva moju Labradorku Belu (2 god., krotka). Ima sve — krevet, hranu. Samo šetnje i ljubav.',
'c0000008-0000-0000-0000-000000000008','Liman IV','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8280, 45.2450), 4326),
'2025-03-29 18:00:00',36,4000,1,0,'open',10,'2025-03-15','2025-03-15'),

('j0000008-0000-0000-0000-000000000008','a1000001-0000-0000-0000-000000000001',
'Dostava namirnica za starije komšije',
'Imam tri komšije starije od 80 god koji ne mogu sami do pijace. Treba im dostaviti namirnice sa Tržnice Liman. Lista je unapred pripremljena.',
'c0000004-0000-0000-0000-000000000004','Bulevar cara Lazara','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8300, 45.2600), 4326),
'2025-03-21 10:00:00',3,1500,1,1,'in_progress',10,'2025-03-11','2025-03-12'),

('j0000009-0000-0000-0000-000000000009','a1000005-0000-0000-0000-000000000005',
'Pomoćnik na vencanju — postavljanje stola i stolica',
'Vencanje u sali u Novom Sadu. Treba postaviti 25 stolova i 200 stolica, ukrasiti i posle pospremiti. Sve materijale imamo.',
'c0000011-0000-0000-0000-000000000011','Futoška','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8410, 45.2580), 4326),
'2025-04-05 08:00:00',10,3500,4,0,'open',10,'2025-03-13','2025-03-13'),

('j0000010-0000-0000-0000-000000000010','a1000003-0000-0000-0000-000000000003',
'Pranje i detaljing automobila na adresi',
'Dva automobila (Passat B8 + Octavia). Kompletan eksterijer i enterijer, keramička zaštita opciono. Dolazite sa sopstvenom opremom.',
'c0000016-0000-0000-0000-000000000016','Radnička ulica','Novi Sad',
ST_SetSRID(ST_MakePoint(19.8450, 45.2700), 4326),
'2025-03-26 09:00:00',4,4000,1,0,'open',10,'2025-03-14','2025-03-14'),

-- Beograd (12 jobs)
('j0000011-0000-0000-0000-000000000011','a1000007-0000-0000-0000-000000000007',
'Selidba firme u novoj poslovni prostor',
'Kompanija se seli, oko 30 kancelarija. Treba preneti nameštaj i opremu na novu lokaciju na Novom Beogradu. Ima lift.',
'c0000001-0000-0000-0000-000000000001','Mihaila Pupina Bulevar','Beograd',
ST_SetSRID(ST_MakePoint(20.4133, 44.8090), 4326),
'2025-03-22 07:00:00',10,4500,5,2,'in_progress',10,'2025-03-10','2025-03-11'),

('j0000012-0000-0000-0000-000000000012','a1000009-0000-0000-0000-000000000009',
'Farbanje spoljašnjosti kuće — prizemlje',
'Kuća od cigle, fasada treba farbanje. Prizemlje + garaža, oko 80m2 fasade. Materijal se obezbeduje.',
'c0000006-0000-0000-0000-000000000006','Zemunski put','Beograd',
ST_SetSRID(ST_MakePoint(20.4010, 44.8450), 4326),
'2025-03-29 08:00:00',8,5000,2,0,'open',10,'2025-03-12','2025-03-12'),

('j0000013-0000-0000-0000-000000000013','a1000007-0000-0000-0000-000000000007',
'Čišćenje stana pre useljenja — 3.5 sobe',
'Stan kupljen na sekundarnom tržištu, treba dubinsko čišćenje svih prostorija. Oko 90m2. Sredstva obezbeđujemo.',
'c0000003-0000-0000-0000-000000000003','Vojvode Stepe','Beograd',
ST_SetSRID(ST_MakePoint(20.4890, 44.7820), 4326),
'2025-03-21 09:00:00',5,3000,2,0,'open',10,'2025-03-11','2025-03-11'),

('j0000014-0000-0000-0000-000000000014','a1000010-0000-0000-0000-000000000010',
'Hitna vodoinstalaterska intervencija — pukla cev',
'Pukla cev u kuhinji, voda teče. Treba hitna intervencija danas ili sutra. Stan na Vračaru. Platiću hitno.',
'c0000015-0000-0000-0000-000000000015','Njegoševa ulica','Beograd',
ST_SetSRID(ST_MakePoint(20.4670, 44.7980), 4326),
'2025-03-18 10:00:00',2,6000,1,1,'completed',10,'2025-03-18','2025-03-18'),

('j0000015-0000-0000-0000-000000000015','a1000007-0000-0000-0000-000000000007',
'Ugradnja bojlera i tuš kabine',
'Renoviranje kupatila. Treba ugraditi novi bojler 80L i tuš kabinu. Sve kupljeno, treba majstor da montira.',
'c0000015-0000-0000-0000-000000000015','Kneza Miloša','Beograd',
ST_SetSRID(ST_MakePoint(20.4603, 44.8070), 4326),
'2025-03-26 09:00:00',5,7000,1,0,'open',10,'2025-03-12','2025-03-12'),

('j0000016-0000-0000-0000-000000000016','a1000009-0000-0000-0000-000000000009',
'Instrukcije iz matematike — 8. razred',
'Sin sprema prijemni za SIC. Treba instruktor matematike, minimum 2h nedeljno do marta. Dolazak na Zvezdaru ili online.',
'c0000018-0000-0000-0000-000000000018','Zvezdarska ulica','Beograd',
ST_SetSRID(ST_MakePoint(20.5010, 44.8050), 4326),
'2025-03-20 17:00:00',2,2500,1,1,'in_progress',10,'2025-03-11','2025-03-12'),

('j0000017-0000-0000-0000-000000000017','a1000007-0000-0000-0000-000000000007',
'Iskopavanje temelja za bazen u bašti',
'Bazen 4x8m, dubina 1.5m. Treba kopati ručno ili malim strojem. Zemlja je glinasta. Iskopana zemlja treba odvesti.',
'c0000013-0000-0000-0000-000000000013','Banovo Brdo','Beograd',
ST_SetSRID(ST_MakePoint(20.4060, 44.7730), 4326),
'2025-03-28 07:00:00',12,5000,3,0,'open',10,'2025-03-13','2025-03-13'),

('j0000018-0000-0000-0000-000000000018','a1000010-0000-0000-0000-000000000010',
'Čuvanje dece — bliznaci 4 god',
'Dva blizanca 4 god, treba nam čuvarka od 8-16h radnim danima. Treba vozačka dozvola. Stan na Novom Beogradu.',
'c0000010-0000-0000-0000-000000000010','Bulevar Arsenija Čarnojevića','Beograd',
ST_SetSRID(ST_MakePoint(20.4020, 44.8160), 4326),
'2025-03-20 08:00:00',8,3000,1,0,'open',10,'2025-03-14','2025-03-14'),

('j0000019-0000-0000-0000-000000000019','a1000007-0000-0000-0000-000000000007',
'Demontaža i odlaganje starog nameštaja',
'Imamo staru kuhinju i sobu za demontirati. Sve treba izneti i odvesti u deponiju. Ima lift u zgradi.',
'c0000001-0000-0000-0000-000000000001','Skadarska ulica','Beograd',
ST_SetSRID(ST_MakePoint(20.4720, 44.8200), 4326),
'2025-03-24 09:00:00',4,2000,2,0,'open',10,'2025-03-13','2025-03-13'),

('j0000020-0000-0000-0000-000000000020','a1000009-0000-0000-0000-000000000009',
'Frizura i manikir za stariju gospodu',
'Majka (78 god) nije pokretna. Treba frizer i manikir koji dolaze kući. Dorćol, treći sprat bez lifta.',
'c0000017-0000-0000-0000-000000000017','Cara Dušana','Beograd',
ST_SetSRID(ST_MakePoint(20.4560, 44.8230), 4326),
'2025-03-22 11:00:00',2,3500,1,0,'open',10,'2025-03-13','2025-03-13'),

('j0000021-0000-0000-0000-000000000021','a1000007-0000-0000-0000-000000000007',
'Organizacija i pospremanje magacina',
'Firma ima magacin 200m2 koji treba sređivati i organizovati police i robu. Jednodnevni posao, 2 osobe.',
'c0000012-0000-0000-0000-000000000012','Pančevački put','Beograd',
ST_SetSRID(ST_MakePoint(20.5280, 44.8390), 4326),
'2025-03-25 07:00:00',8,3000,2,0,'open',10,'2025-03-14','2025-03-14'),

('j0000022-0000-0000-0000-000000000022','a1000010-0000-0000-0000-000000000010',
'Montaža TV na zid i uređenje AV sistema',
'TV 75 inča, treba montirati na zid, proveriti i podesiti AV sistem i soundbar. Stan na Savamali.',
'c0000005-0000-0000-0000-000000000005','Karađorđeva ulica','Beograd',
ST_SetSRID(ST_MakePoint(20.4490, 44.8130), 4326),
'2025-03-21 15:00:00',2,4000,1,0,'open',10,'2025-03-14','2025-03-14'),

-- Niš (6 jobs)
('j0000023-0000-0000-0000-000000000023','a1000011-0000-0000-0000-000000000011',
'Selidba dvosobnog stana u Nišu',
'Selidba iz Medijane u Pantelej. Kombi imamo, treba 3 radnika. Nameštaj je demontiran, treba nositi i utovari.',
'c0000001-0000-0000-0000-000000000001','Bulevar Nikole Tesle','Niš',
ST_SetSRID(ST_MakePoint(21.9033, 43.3209), 4326),
'2025-03-22 08:00:00',5,3000,3,0,'open',10,'2025-03-10','2025-03-10'),

('j0000024-0000-0000-0000-000000000024','a1000013-0000-0000-0000-000000000013',
'Bojenje i krečenje enterijera',
'Tražim molera za 3-sobni stan ~85m2. Sve prostorije treba kreirati, zidovi su u dobrom stanju.',
'c0000006-0000-0000-0000-000000000006','Obrenovićeva','Niš',
ST_SetSRID(ST_MakePoint(21.8960, 43.3180), 4326),
'2025-03-27 08:00:00',3,4500,1,0,'open',10,'2025-03-11','2025-03-11'),

('j0000025-0000-0000-0000-000000000025','a1000011-0000-0000-0000-000000000011',
'Električni kvar — osiguač i struja ne radi',
'Pao struja u stanu, osiguraj je izbačen ali se ne vraća. Treba elektricar da pregleda i reši. Hitno.',
'c0000014-0000-0000-0000-000000000014','Trg Kralja Aleksandra','Niš',
ST_SetSRID(ST_MakePoint(21.8975, 43.3203), 4326),
'2025-03-19 09:00:00',2,3000,1,1,'completed',10,'2025-03-15','2025-03-16'),

('j0000026-0000-0000-0000-000000000026','a1000013-0000-0000-0000-000000000013',
'Čuvanje starije gospođe — 10 dana',
'Majka 84 god, pokretna ali treba neko uz nju. Potrebna je osoba da bude sa njom dok smo na putu. Spavanje kod nas.',
'c0000009-0000-0000-0000-000000000009','Sinđelićev trg','Niš',
ST_SetSRID(ST_MakePoint(21.8920, 43.3170), 4326),
'2025-04-01 00:00:00',240,1500,1,0,'open',10,'2025-03-13','2025-03-13'),

('j0000027-0000-0000-0000-000000000027','a1000015-0000-0000-0000-000000000015',
'Uređenje bašte — orezivanje i sadnja',
'Bašta ~150m2, ima voćnjak koji treba orezati (šljive i kruške) i leje za sadnju povrća.',
'c0000007-0000-0000-0000-000000000007','Dunavska ulica, Niška Banja','Niška Banja',
ST_SetSRID(ST_MakePoint(22.0140, 43.3070), 4326),
'2025-03-30 08:00:00',6,2500,2,0,'open',10,'2025-03-12','2025-03-12'),

('j0000028-0000-0000-0000-000000000028','a1000011-0000-0000-0000-000000000011',
'Pomoć na manifestaciji za Oskar fest',
'Tražimo pomoćnike za postavljanje bine i tehničke opreme za Oskar fest. Fizički posao, treba snage.',
'c0000011-0000-0000-0000-000000000011','Trg Kralja Milana','Niš',
ST_SetSRID(ST_MakePoint(21.8956, 43.3212), 4326),
'2025-04-10 07:00:00',12,2500,6,0,'open',10,'2025-03-13','2025-03-13'),

-- Kragujevac (4 jobs)
('j0000029-0000-0000-0000-000000000029','a1000017-0000-0000-0000-000000000017',
'Servis automobila na terenu — Kragujevac',
'Trebam servisirati Golfa V. Može doći mobilni mehaničar. Menjanje ulja, filtera, svecica.',
'c0000005-0000-0000-0000-000000000005','Cara Dušana','Kragujevac',
ST_SetSRID(ST_MakePoint(20.9224, 44.0165), 4326),
'2025-03-23 10:00:00',3,5000,1,0,'open',10,'2025-03-11','2025-03-11'),

('j0000030-0000-0000-0000-000000000030','a1000016-0000-0000-0000-000000000016',
'Čišćenje i sređivanje poslovnog prostora',
'Kafić ~80m2, treba dubinsko čišćenje — podovi, enterijer, kuhinja. Treba doći sa opremom.',
'c0000003-0000-0000-0000-000000000003','Kneza Miloša','Kragujevac',
ST_SetSRID(ST_MakePoint(20.9170, 44.0090), 4326),
'2025-03-21 06:00:00',5,3500,2,0,'open',10,'2025-03-12','2025-03-12'),

('j0000031-0000-0000-0000-000000000031','a1000017-0000-0000-0000-000000000017',
'Montaža plastičnih prozora i vrata',
'Menjamo 5 prozora i 2 vrata u stanu. Prozori su doneseni, treba monter koji zna da ugradi.',
'c0000005-0000-0000-0000-000000000005','Nikole Pašića','Kragujevac',
ST_SetSRID(ST_MakePoint(20.9105, 44.0130), 4326),
'2025-03-29 08:00:00',8,6000,1,0,'open',10,'2025-03-13','2025-03-13'),

('j0000032-0000-0000-0000-000000000032','a1000019-0000-0000-0000-000000000019',
'Letnje orezivanje voćnjaka',
'Voćnjak ~30 stabala (šljive, jabuke, kruške). Treba orezati, ukloniti suve grane i tretirati.',
'c0000007-0000-0000-0000-000000000007','Šumarice','Kragujevac',
ST_SetSRID(ST_MakePoint(20.9300, 44.0050), 4326),
'2025-03-25 08:00:00',8,2000,2,0,'open',10,'2025-03-14','2025-03-14'),

-- Subotica (4 jobs)
('j0000033-0000-0000-0000-000000000033','a1000021-0000-0000-0000-000000000021',
'Molerski radovi u novom stanu',
'Stan 65m2, sve sobe treba kreirati. Imamo boju, treba moler sa iskustvom. Rad za 2 dana.',
'c0000006-0000-0000-0000-000000000006','Korzo','Subotica',
ST_SetSRID(ST_MakePoint(19.6650, 46.1001), 4326),
'2025-03-24 08:00:00',16,4000,1,0,'open',10,'2025-03-10','2025-03-10'),

('j0000034-0000-0000-0000-000000000034','a1000022-0000-0000-0000-000000000022',
'Dubinsko čišćenje kuće pre prodaje',
'Kuća 120m2, 4 sobe + 2 kupatila + kuhinja. Treba dubinsko čišćenje i uredjivanje pre fotografisanja za prodaju.',
'c0000003-0000-0000-0000-000000000003','Matije Korvina','Subotica',
ST_SetSRID(ST_MakePoint(19.6720, 46.0960), 4326),
'2025-03-22 08:00:00',6,4000,2,1,'in_progress',10,'2025-03-11','2025-03-12'),

('j0000035-0000-0000-0000-000000000035','a1000023-0000-0000-0000-000000000023',
'Dostava robe iz Budimpešte u Suboticu',
'Treba mi neko ko ide redovno Budimpešta-Subotica i može da donese paket ~15kg. Plati se unapred.',
'c0000004-0000-0000-0000-000000000004','Segedinski put','Subotica',
ST_SetSRID(ST_MakePoint(19.6820, 46.1070), 4326),
'2025-03-20 14:00:00',1,3000,1,1,'completed',10,'2025-03-17','2025-03-18'),

('j0000036-0000-0000-0000-000000000036','a1000021-0000-0000-0000-000000000021',
'Ugradnja solarne instalacije za grejanje vode',
'Želi solarni kolektor za toplu vodu. 2 panela, bojler 200L. Treba montaža i spajanje na sistem.',
'c0000005-0000-0000-0000-000000000005','Dimitrija Tucovića','Subotica',
ST_SetSRID(ST_MakePoint(19.6600, 46.0920), 4326),
'2025-04-02 08:00:00',10,12000,1,0,'open',10,'2025-03-13','2025-03-13'),

-- Čačak / Šumadija (3 jobs)
('j0000037-0000-0000-0000-000000000037','a1000028-0000-0000-0000-000000000028',
'Izlivanje betonske ploče za terasu',
'Terasa ~20m2 treba betonsku ploču debljine 12cm. Treba 3 fizička radnika za armature i betoniranje.',
'c0000013-0000-0000-0000-000000000013','Obilićeva ulica','Čačak',
ST_SetSRID(ST_MakePoint(20.3492, 43.8916), 4326),
'2025-03-26 07:00:00',8,3500,3,0,'open',10,'2025-03-11','2025-03-11'),

('j0000038-0000-0000-0000-000000000038','a1000030-0000-0000-0000-000000000030',
'Izgradnja drvene pergole u bašti',
'Bašta 12m2, treba drvena pergola 4x3m sa puzavicama. Imamo materijal, treba tesar.',
'c0000013-0000-0000-0000-000000000013','Kneza Miloša','Gornji Milanovac',
ST_SetSRID(ST_MakePoint(20.4644, 44.0253), 4326),
'2025-03-29 08:00:00',6,6000,1,0,'open',10,'2025-03-12','2025-03-12'),

('j0000039-0000-0000-0000-000000000039','a1000028-0000-0000-0000-000000000028',
'Odvoz građevinskog otpada',
'Renoviranje je gotovo, ostalo ~3 kubika šuta. Treba kamion i utovari da odvezu na deponiju.',
'c0000001-0000-0000-0000-000000000001','Svetog Save','Čačak',
ST_SetSRID(ST_MakePoint(20.3550, 43.8870), 4326),
'2025-03-21 07:00:00',3,2500,2,2,'completed',10,'2025-03-10','2025-03-11'),

-- Smederevo / Požarevac (3 jobs)
('j0000040-0000-0000-0000-000000000040','a1000031-0000-0000-0000-000000000031',
'Zamena vodovodnih cevi u stanu',
'Stan iz 70ih, stare čelične cevi treba zameniti PPR cevima. Cela instalacija ~4 sobe + kupatilo.',
'c0000015-0000-0000-0000-000000000015','Karađorđeva ulica','Smederevo',
ST_SetSRID(ST_MakePoint(20.9283, 44.6652), 4326),
'2025-03-28 08:00:00',12,9000,1,0,'open',10,'2025-03-11','2025-03-11'),

('j0000041-0000-0000-0000-000000000041','a1000045-0000-0000-0000-000000000045',
'Ugradnja video nadzora i alarma',
'Porodična kuća, treba 4 kamere eksterijer + alarmni sistem. Treba elektricar sa iskustvom u sistemima sigurnosti.',
'c0000014-0000-0000-0000-000000000014','Svetog Save','Požarevac',
ST_SetSRID(ST_MakePoint(21.1872, 44.6217), 4326),
'2025-03-25 09:00:00',6,8000,1,0,'open',10,'2025-03-12','2025-03-12'),

('j0000042-0000-0000-0000-000000000042','a1000031-0000-0000-0000-000000000031',
'Krčenje i čišćenje zapuštene parcele',
'Parcela ~600m2, zarasla šibljem i koprivom. Treba krčiti i spremi za obradu. Traktor nije potreban.',
'c0000007-0000-0000-0000-000000000007','Pančevački put','Smederevo',
ST_SetSRID(ST_MakePoint(20.9350, 44.6700), 4326),
'2025-03-30 08:00:00',10,2500,3,0,'open',10,'2025-03-13','2025-03-13'),

-- Vranje / Leskovac / Prokuplje (3 jobs)
('j0000043-0000-0000-0000-000000000043','a1000037-0000-0000-0000-000000000037',
'Spoljašnja fasada porodične kuće',
'Kuća P+1, fasada treba thermosol i strukturna boja. Površina ~160m2. Treba 2 molera sa iskustvom.',
'c0000006-0000-0000-0000-000000000006','Pana Đukića','Leskovac',
ST_SetSRID(ST_MakePoint(21.9512, 42.9983), 4326),
'2025-04-01 07:00:00',3,5000,2,0,'open',10,'2025-03-10','2025-03-10'),

('j0000044-0000-0000-0000-000000000044','a1000035-0000-0000-0000-000000000035',
'Berba kajsija — sezonski rad',
'Voćnjak kajsija ~1ha, treba 5-7 beračad na 3-4 dana. Isplata po kg ili dnevno.',
'c0000013-0000-0000-0000-000000000013','Vranjska Banja','Vranje',
ST_SetSRID(ST_MakePoint(21.9703, 42.4910), 4326),
'2025-07-01 06:00:00',8,2000,6,0,'open',10,'2025-03-13','2025-03-13'),

('j0000045-0000-0000-0000-000000000045','a1000037-0000-0000-0000-000000000037',
'Rigips i pregradni zidovi u poslovnom prostoru',
'Adaptacija poslovnog prostora, treba postaviti 3 pregradna zida od rigipsa sa zvučnom izolacijom.',
'c0000013-0000-0000-0000-000000000013','Jablanička ulica','Leskovac',
ST_SetSRID(ST_MakePoint(21.9450, 42.9950), 4326),
'2025-03-24 08:00:00',10,5000,2,0,'open',10,'2025-03-12','2025-03-12'),

-- Šabac / Valjevo / Kruševac (4 jobs)
('j0000046-0000-0000-0000-000000000046','a1000033-0000-0000-0000-000000000033',
'Montaža solarnih panela na kući',
'6 panela 400W, inverter i baterija. Krov je pod nagibom, treba iskusan monter.',
'c0000014-0000-0000-0000-000000000014','Gospodar Jovanova','Šabac',
ST_SetSRID(ST_MakePoint(19.6866, 44.7541), 4326),
'2025-03-31 08:00:00',12,10000,1,0,'open',10,'2025-03-10','2025-03-10'),

('j0000047-0000-0000-0000-000000000047','a1000039-0000-0000-0000-000000000039',
'Kovanje i montaža kapije za dvorište',
'Dvorišna kapija metalna, treba iskucati i montirati na stub. Mere 3.5m x 1.8m.',
'c0000013-0000-0000-0000-000000000013','Miloša Obrenovića','Valjevo',
ST_SetSRID(ST_MakePoint(19.8849, 44.2738), 4326),
'2025-04-03 08:00:00',8,8000,1,0,'open',10,'2025-03-11','2025-03-11'),

('j0000048-0000-0000-0000-000000000048','a1000041-0000-0000-0000-000000000041',
'Renoviranje kupatila — keramika i sanitarija',
'Kupatilo ~6m2, kompletno renoviranje — rušenje stare keramike, nova keramika zid i pod, nova sanitarija.',
'c0000015-0000-0000-0000-000000000015','Balkanska ulica','Kruševac',
ST_SetSRID(ST_MakePoint(21.3272, 43.5801), 4326),
'2025-03-27 08:00:00',14,12000,1,0,'open',10,'2025-03-12','2025-03-12'),

-- Zrenjanin / Pančevo / Kikinda (3 jobs)
('j0000049-0000-0000-0000-000000000049','a1000049-0000-0000-0000-000000000049',
'Transport nameštaja Zrenjanin-Beograd',
'Selidba, treba kombi ili manji kamion. Nameštaj za 2 sobe + bela tehnika. Zrenjanin → Beograd.',
'c0000004-0000-0000-0000-000000000004','Kralja Aleksandra','Zrenjanin',
ST_SetSRID(ST_MakePoint(20.3910, 45.3826), 4326),
'2025-03-23 07:00:00',5,5000,2,0,'open',10,'2025-03-11','2025-03-11'),

('j0000050-0000-0000-0000-000000000050','a1000046-0000-0000-0000-000000000046',
'Bojenje i ukrašavanje terase restorana',
'Terasa restorana treba osvežavanje — bojenje i dekorativne boje. ~60m2. Za vikend dok je restoran zatvoren.',
'c0000006-0000-0000-0000-000000000006','Kralja Petra I','Pančevo',
ST_SetSRID(ST_MakePoint(20.6405, 44.8704), 4326),
'2025-03-22 07:00:00',12,4500,2,1,'in_progress',10,'2025-03-10','2025-03-11')

ON CONFLICT (id) DO NOTHING;


-- ─── SEED RATINGS ────────────────────────────────────────────
-- Add some realistic ratings between users
INSERT INTO ratings (id, job_id, rater_id, ratee_id, score, comment, rater_role, created_at)
VALUES
('r0000001-0000-0000-0000-000000000001','j0000003-0000-0000-0000-000000000003','a1000003-0000-0000-0000-000000000003','a1000002-0000-0000-0000-000000000002',5,'Ana je odradila posao savrseno, stan je blista!','poster','2025-01-15'),
('r0000002-0000-0000-0000-000000000002','j0000003-0000-0000-0000-000000000003','a1000002-0000-0000-0000-000000000002','a1000003-0000-0000-0000-000000000003',5,'Super poslodavac, sve jasno dogovoreno, isplata odmah.','worker','2025-01-15'),
('r0000003-0000-0000-0000-000000000003','j0000014-0000-0000-0000-000000000014','a1000010-0000-0000-0000-000000000010','a1000009-0000-0000-0000-000000000009',5,'Hitna intervencija, majstor dosao za sat, skvican posao!','poster','2025-02-10'),
('r0000004-0000-0000-0000-000000000004','j0000025-0000-0000-0000-000000000025','a1000011-0000-0000-0000-000000000011','a1000015-0000-0000-0000-000000000015',4,'Brz i stručan, malo skuplje ali vredi.','poster','2025-01-28'),
('r0000005-0000-0000-0000-000000000005','j0000035-0000-0000-0000-000000000035','a1000021-0000-0000-0000-000000000021','a1000023-0000-0000-0000-000000000023',5,'Tacno i pouzdano, paket stigao bez ostecenja.','poster','2025-02-05'),
('r0000006-0000-0000-0000-000000000006','j0000039-0000-0000-0000-000000000039','a1000028-0000-0000-0000-000000000028','a1000029-0000-0000-0000-000000000029',5,'Brzo i temeljno, dvoriste ocisceno do dlake.','poster','2025-02-15'),
('r0000007-0000-0000-0000-000000000007','j0000039-0000-0000-0000-000000000039','a1000029-0000-0000-0000-000000000029','a1000028-0000-0000-0000-000000000028',5,'Odlican gazda, jasna uputstva i odmah platio.','worker','2025-02-15')
ON CONFLICT (id) DO NOTHING;

-- ─── UPDATE profile stats to reflect seed data ───────────────
-- Update total_earnings for workers (calculated sum)
UPDATE profiles SET total_earnings = COALESCE(
  (SELECT SUM(j.pay_per_worker)
   FROM applications a
   JOIN jobs j ON j.id = a.job_id
   WHERE a.worker_id = profiles.id AND a.status = 'accepted'),
  0
);

-- Done! Run this file once in Supabase SQL editor.
-- IMPORTANT: The profile UUIDs (a1000001...) must also be created in auth.users
-- for full authentication flow. For demo seeding without auth, profiles are
-- viewable as poster data but cannot log in without auth.users entries.

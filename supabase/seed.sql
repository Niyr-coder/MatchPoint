-- MATCHPOINT — Seed Data
-- Datos de prueba para desarrollo local
-- Ejecutar DESPUÉS de todas las migraciones

-- ============================================================
-- Clubs de prueba
-- ============================================================
INSERT INTO public.clubs (id, name, slug, description, address, city, province, is_active, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Club Pichincha Sport', 'club-pichincha-sport', 'El mejor club de deportes de raqueta en Quito', 'Av. 6 de Diciembre N36-109', 'Quito', 'Pichincha', true, (SELECT id FROM auth.users LIMIT 1)),
  ('00000000-0000-0000-0000-000000000002', 'SportCenter Norte', 'sportcenter-norte', 'Canchas de fútbol 5 y más', 'Av. Real Audiencia y Jaime Roldós', 'Quito', 'Pichincha', true, (SELECT id FROM auth.users LIMIT 1)),
  ('00000000-0000-0000-0000-000000000003', 'Racket Club Cumbayá', 'racket-club-cumbaya', 'Tenis y Pickleball en Cumbayá', 'Av. Interoceánica km 14', 'Quito', 'Pichincha', true, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Canchas de prueba
-- ============================================================
INSERT INTO public.courts (id, club_id, name, sport, surface_type, is_indoor, price_per_hour, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cancha Pádel 1', 'padel', 'cristal', true,  20.00, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Cancha Pádel 2', 'padel', 'cristal', true,  20.00, true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cancha Tenis A',  'tenis', 'arcilla', false, 15.00, true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Cancha Fútbol 5 A', 'futbol', 'cesped_sintetico', false, 40.00, true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Cancha Fútbol 5 B', 'futbol', 'cesped_sintetico', false, 40.00, true),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'Cancha Tenis 1',   'tenis', 'cemento', false, 18.00, true),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'Cancha Pickleball 1', 'pickleball', 'cemento', false, 12.00, true),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003', 'Cancha Pickleball 2', 'pickleball', 'cemento', false, 12.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Horarios de canchas (lun-vie 06:00-22:00, sáb-dom 07:00-21:00)
-- ============================================================
INSERT INTO public.court_schedules (court_id, day_of_week, open_time, close_time)
SELECT c.id, d.day, '06:00'::TIME, '22:00'::TIME
FROM public.courts c
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(day)
ON CONFLICT DO NOTHING;

INSERT INTO public.court_schedules (court_id, day_of_week, open_time, close_time)
SELECT c.id, d.day, '07:00'::TIME, '21:00'::TIME
FROM public.courts c
CROSS JOIN (VALUES (0),(6)) AS d(day)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Torneos de prueba (públicos, status=open)
-- ============================================================
INSERT INTO public.tournaments (id, created_by, club_id, name, sport, description, max_participants, start_date, end_date, status, entry_fee)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   (SELECT id FROM auth.users LIMIT 1),
   '00000000-0000-0000-0000-000000000001',
   'Copa Pádel Quito 2025', 'padel',
   'Torneo amateur de pádel mixto. Nivel: iniciante a intermedio.',
   16, CURRENT_DATE + 15, CURRENT_DATE + 17, 'open', 25.00),

  ('20000000-0000-0000-0000-000000000002',
   (SELECT id FROM auth.users LIMIT 1),
   '00000000-0000-0000-0000-000000000002',
   'Torneo Fútbol 5 Primavera', 'futbol',
   'Liga relámpago de fútbol 5. Equipos de 5 jugadores.',
   12, CURRENT_DATE + 22, CURRENT_DATE + 22, 'open', 50.00),

  ('20000000-0000-0000-0000-000000000003',
   (SELECT id FROM auth.users LIMIT 1),
   '00000000-0000-0000-0000-000000000003',
   'Open de Tenis Norte', 'tenis',
   'Torneo de tenis singles masculino y femenino.',
   32, CURRENT_DATE + 35, CURRENT_DATE + 37, 'open', 30.00),

  ('20000000-0000-0000-0000-000000000004',
   (SELECT id FROM auth.users LIMIT 1),
   '00000000-0000-0000-0000-000000000003',
   'Liga Pickleball Amateur', 'pickleball',
   'Primera liga de pickleball en Ecuador. ¡Únetenos!',
   20, CURRENT_DATE + 40, CURRENT_DATE + 42, 'open', 15.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Eventos oficiales MatchPoint
-- ============================================================
INSERT INTO public.events (id, title, description, sport, location, city, start_date, end_date, is_featured, created_by)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   'MatchPoint Open 2025 — Pádel',
   'El evento más grande de pádel en Ecuador. Categorías PRO y Amateur. Transmisión en vivo.',
   'padel', 'Centro de Alto Rendimiento, Quito', 'Quito',
   (CURRENT_TIMESTAMP + interval '20 days'),
   (CURRENT_TIMESTAMP + interval '22 days'),
   true, (SELECT id FROM auth.users LIMIT 1)),

  ('30000000-0000-0000-0000-000000000002',
   'Clinica de Tenis con Pro Nacional',
   'Aprende con el mejor. Clinica intensiva de tenis con jugador rankeado en Ecuador.',
   'tenis', 'Racket Club Cumbayá', 'Quito',
   (CURRENT_TIMESTAMP + interval '30 days'),
   (CURRENT_TIMESTAMP + interval '30 days'),
   false, (SELECT id FROM auth.users LIMIT 1)),

  ('30000000-0000-0000-0000-000000000003',
   'Torneo Nacional Juvenil de Fútbol 5',
   'Competencia nacional para jugadores sub-18. Clasificatorias regionales.',
   'futbol', 'SportCenter Norte', 'Quito',
   (CURRENT_TIMESTAMP + interval '45 days'),
   (CURRENT_TIMESTAMP + interval '47 days'),
   true, (SELECT id FROM auth.users LIMIT 1)),

  ('30000000-0000-0000-0000-000000000004',
   'Introducción al Pickleball — Workshop Gratis',
   'Descubre el deporte de más rápido crecimiento. Raquetas y pelotas incluidas.',
   'pickleball', 'Racket Club Cumbayá', 'Quito',
   (CURRENT_TIMESTAMP + interval '10 days'),
   (CURRENT_TIMESTAMP + interval '10 days'),
   false, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (id) DO NOTHING;

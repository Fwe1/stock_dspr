-- 성능 측정용 더미 데이터 (stockdspr_perf 전용)
-- 전제: perf 프로필로 앱을 한 번 실행해서 Hibernate가 테이블/시퀀스를 만든 상태
-- 실행: psql -U postgres -h localhost -d stockdspr_perf -f perf/seed_perf.sql
-- 다시 실행하면 기존 데이터를 지우고 같은 데이터로 새로 채운다 (setseed 고정)

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';

-- 다른 DB에 잘못 실행하는 것 방지
SELECT current_database() = 'stockdspr_perf' AS is_perf_db \gset
\if :is_perf_db
\else
  \echo 'stockdspr_perf DB가 아니라서 중단합니다'
  \quit
\endif

BEGIN;

TRUNCATE reservation, stock, facility_inventory, item, facility;

SELECT setseed(0.42);

-- 1. 기관 2,000곳 (서울 60%, 대구 25%, 부산 7%, 대전 8%)
INSERT INTO facility (facility_id, facility_name, address, contact_name, contact_number,
                      latitude, longitude, operation_status)
SELECT t.g,
       reg.city || ' ' || reg.districts[1 + t.g % array_length(reg.districts, 1)] || ' '
           || (ARRAY['병원', '의원', '약국', '보건소'])[1 + t.g % 4] || ' ' || t.g,
       reg.city || ' ' || reg.districts[1 + t.g % array_length(reg.districts, 1)] || ' '
           || (1 + t.g % 300) || '번길 ' || (1 + t.g % 50),
       (ARRAY['김', '이', '박', '최', '정', '강', '조', '윤'])[1 + t.g % 8] || '담당',
       '010-' || lpad((1000 + t.g % 9000)::text, 4, '0') || '-' || lpad((t.g * 7 % 10000)::text, 4, '0'),
       round((reg.lat_min + t.a * (reg.lat_max - reg.lat_min))::numeric, 6),
       round((reg.lng_min + t.b * (reg.lng_max - reg.lng_min))::numeric, 6),
       CASE WHEN t.s < 0.95 THEN 'ACTIVE' ELSE 'SUSPENDED' END
FROM (SELECT g, random() AS r, random() AS a, random() AS b, random() AS s
      FROM generate_series(1, 2000) g) t
JOIN (VALUES
        ('서울', 0.00, 0.60, 37.43, 37.70, 126.76, 127.18,
         ARRAY['강남구', '서초구', '송파구', '마포구', '종로구', '중구', '영등포구', '관악구', '노원구', '은평구']),
        ('대구', 0.60, 0.85, 35.78, 35.95, 128.48, 128.72,
         ARRAY['중구', '동구', '서구', '남구', '북구', '수성구', '달서구']),
        ('부산', 0.85, 0.92, 35.05, 35.25, 128.95, 129.20,
         ARRAY['해운대구', '부산진구', '동래구', '사하구']),
        ('대전', 0.92, 1.01, 36.28, 36.42, 127.32, 127.46,
         ARRAY['유성구', '서구', '중구'])
     ) AS reg(city, r_from, r_to, lat_min, lat_max, lng_min, lng_max, districts)
  ON t.r >= reg.r_from AND t.r < reg.r_to;

-- 2. 의약품 500종 (기본 약 20개 x 25가지 규격)
INSERT INTO item (item_id, name, ingredients, storage_conditions)
SELECT g,
       base.kor || ' ' || base.form || ' ' || (1 + (g - 1) / 20) || '호',
       base.ingredient,
       CASE WHEN random() < 0.6 THEN '실온(1~30℃)'
            WHEN random() < 0.75 THEN '냉장(2~8℃)'
            ELSE '냉동(-20℃ 이하)' END
FROM generate_series(1, 500) g
JOIN (SELECT row_number() OVER () - 1 AS idx, *
      FROM (VALUES
          ('에피네프린', '주사', 'Epinephrine'),
          ('아트로핀', '주사', 'Atropine sulfate'),
          ('아미오다론', '주사', 'Amiodarone HCl'),
          ('아데노신', '주사', 'Adenosine'),
          ('날록손', '주사', 'Naloxone HCl'),
          ('니트로글리세린', '설하정', 'Nitroglycerin'),
          ('아스피린', '정', 'Acetylsalicylic acid'),
          ('헤파린', '주사', 'Heparin sodium'),
          ('인슐린', '주사', 'Insulin human'),
          ('포도당', '주사', 'Dextrose 50%'),
          ('미다졸람', '주사', 'Midazolam'),
          ('디아제팜', '주사', 'Diazepam'),
          ('덱사메타손', '주사', 'Dexamethasone'),
          ('살부타몰', '흡입제', 'Salbutamol'),
          ('푸로세미드', '주사', 'Furosemide'),
          ('리도카인', '주사', 'Lidocaine HCl'),
          ('탄산수소나트륨', '주사', 'Sodium bicarbonate'),
          ('염화칼슘', '주사', 'Calcium chloride'),
          ('항독소', '주사', 'Antivenom'),
          ('알테플라제', '주사', 'Alteplase')
      ) v(kor, form, ingredient)) base
  ON base.idx = (g - 1) % 20;

-- 3. 재고(로트) 200,000건: 기관당 100건, 서로 다른 의약품 70종 (30종은 로트 2개)
--    item_id = (f*131 + j*7) % 500 + 1 은 j(0~69)마다 서로 다름 (7과 500이 서로소)
INSERT INTO stock (stock_id, item_id, facility_id, on_hand_qty, reserved_qty,
                   expiration_date, usage_status)
SELECT (f - 1) * 100 + k,
       (f * 131 + ((k - 1) % 70) * 7) % 500 + 1,
       f,
       CASE WHEN q < 0.1 THEN 0 ELSE 1 + floor(power(random(), 2) * 200)::int END,
       0,
       exp_date,
       CASE WHEN exp_date < current_date THEN 'NOT_IN_USE' ELSE 'IN_USE' END
FROM (SELECT f, k, random() AS q,
             current_date + (-30 + floor(random() * 1126))::int AS exp_date
      FROM generate_series(1, 2000) f, generate_series(1, 100) k) t;

-- 4. 기관 취급 품목: stock의 (기관, 의약품) 조합과 동일 (140,000건)
INSERT INTO facility_inventory (facility_inventory_id, item_id, facility_id)
SELECT row_number() OVER (ORDER BY facility_id, item_id), item_id, facility_id
FROM (SELECT DISTINCT facility_id, item_id FROM stock) p;

-- 5-1. 지난 예약 90,000건 (최근 90일, EXPIRED/CONFIRMED/CANCELLED/REJECTED)
INSERT INTO reservation (reservation_id, stock_id, quantity, idempotency_key,
                         status, expires_at, created_at)
SELECT g,
       1 + floor(random() * 200000)::int,
       1 + floor(random() * 20)::int,
       CASE WHEN random() < 0.7 THEN 'perf-' || g END,
       CASE WHEN r < 0.40 / 0.9 THEN 'EXPIRED'
            WHEN r < 0.75 / 0.9 THEN 'CONFIRMED'
            WHEN r < 0.85 / 0.9 THEN 'CANCELLED'
            ELSE 'REJECTED' END,
       created + interval '10 minutes',
       created
FROM (SELECT g, random() AS r,
             now()::timestamp - random() * interval '90 days' AS created
      FROM generate_series(1, 90000) g) t;

-- 5-2. 진행 중(HELD) 예약 10,000건: 가용 수량이 있는 재고에 1건씩, 최근 10분 이내 생성
INSERT INTO reservation (reservation_id, stock_id, quantity, idempotency_key,
                         status, expires_at, created_at)
SELECT 90000 + row_number() OVER (ORDER BY c.stock_id),
       c.stock_id,
       1 + floor(random() * least(5, c.on_hand_qty))::int,
       'perf-held-' || c.stock_id,
       'HELD',
       c.created + interval '10 minutes',
       c.created
FROM (SELECT stock_id, on_hand_qty,
             now()::timestamp - random() * interval '9 minutes' AS created
      FROM stock
      WHERE usage_status = 'IN_USE' AND on_hand_qty >= 1
      ORDER BY random()
      LIMIT 10000) c;

-- HELD 수량을 재고의 예약 수량에 반영 (가용 = 실재고 - 예약 이 맞도록)
UPDATE stock s
SET reserved_qty = h.qty
FROM (SELECT stock_id, sum(quantity) AS qty
      FROM reservation WHERE status = 'HELD' GROUP BY stock_id) h
WHERE s.stock_id = h.stock_id;

-- 6. Hibernate 시퀀스를 최대 ID 위로 올림 (앱에서 INSERT 시 키 충돌 방지, allocationSize 50 고려)
SELECT setval('facility_seq', (SELECT max(facility_id) FROM facility) + 100);
SELECT setval('item_seq', (SELECT max(item_id) FROM item) + 100);
SELECT setval('stock_seq', (SELECT max(stock_id) FROM stock) + 100);
SELECT setval('facility_inventory_seq', (SELECT max(facility_inventory_id) FROM facility_inventory) + 100);
SELECT setval('reservation_seq', (SELECT max(reservation_id) FROM reservation) + 100);

COMMIT;

ANALYZE facility, item, stock, facility_inventory, reservation;

-- 결과 확인
SELECT 'facility' AS tbl, count(*) FROM facility
UNION ALL SELECT 'item', count(*) FROM item
UNION ALL SELECT 'stock', count(*) FROM stock
UNION ALL SELECT 'facility_inventory', count(*) FROM facility_inventory
UNION ALL SELECT 'reservation', count(*) FROM reservation;

-- 선택: "인덱스 있음" 조건으로 비교할 때만 실행
-- PostgreSQL은 FK 컬럼에 인덱스를 자동으로 만들지 않는다
-- 되돌리기: DROP INDEX idx_perf_stock_item, idx_perf_stock_facility, idx_perf_reservation_stock;
CREATE INDEX IF NOT EXISTS idx_perf_stock_item ON stock (item_id);
CREATE INDEX IF NOT EXISTS idx_perf_stock_facility ON stock (facility_id);
CREATE INDEX IF NOT EXISTS idx_perf_reservation_stock ON reservation (stock_id);
ANALYZE stock, reservation;

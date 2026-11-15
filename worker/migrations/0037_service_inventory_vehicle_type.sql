-- Bayt Mustaqbal - migration 0037: jenis kendaraan perawatan (Motor/Mobil).
--
-- Perawatan inventaris kini dikategorikan per jenis kendaraan, bukan per
-- kendaraan spesifik. Tambah vehicle_type (Motor|Mobil). Item lama dipetakan
-- dari jenis kendaraan terhubung; yang tidak bisa dipetakan default ke Motor.

ALTER TABLE service_inventory ADD COLUMN vehicle_type TEXT;

UPDATE service_inventory
SET vehicle_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = service_inventory.vehicle_id
      AND lower(COALESCE(v.jenis, '')) LIKE '%mobil%'
  ) THEN 'Mobil'
  WHEN EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = service_inventory.vehicle_id
      AND lower(COALESCE(v.jenis, '')) LIKE '%motor%'
  ) THEN 'Motor'
  ELSE 'Motor'
END
WHERE vehicle_type IS NULL;

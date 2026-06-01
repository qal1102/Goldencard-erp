-- Migration 0012: Separate project type from survey scale
-- project_type: residential | commercial (Loại công trình)
-- project_scale: single | multi (Quy mô khảo sát) — unchanged

ALTER TABLE "surveys" ADD COLUMN "project_type" varchar(30) DEFAULT 'residential' NOT NULL;

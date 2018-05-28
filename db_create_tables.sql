CREATE SCHEMA webt AUTHORIZATION open_data_gis_admin;
COMMENT ON SCHEMA webt IS 'Tables for WEB työasema';



CREATE TABLE webt."kayttaja" (
	"id" serial NOT NULL,
	"crowd" varchar(64) NOT NULL UNIQUE,
	CONSTRAINT kayttaja_pk PRIMARY KEY ("id")
) WITH (
  OIDS=FALSE
);



CREATE TABLE webt."ryhma" (
	"id" serial NOT NULL,
	"nimi" varchar(64) NOT NULL UNIQUE,
	CONSTRAINT ryhma_pk PRIMARY KEY ("id")
) WITH (
  OIDS=FALSE
);



CREATE TABLE webt."ryhmaKayttaja" (
	"kayttaja_id" integer NOT NULL,
	"ryhma_id" integer NOT NULL
) WITH (
  OIDS=FALSE
);



CREATE TABLE webt."ui_settings" (
	"kayttaja_id" integer NOT NULL,
	"teema" varchar(32) NOT NULL DEFAULT 'vaalea',
	"valittu_tyopoyta" integer NOT NULL
) WITH (
  OIDS=FALSE
);


CREATE TABLE webt."redux_json" (
	"kayttaja_id" integer NOT NULL,
	"data" jsonb
) WITH (
  OIDS=FALSE
);


ALTER TABLE webt."ryhmaKayttaja" ADD CONSTRAINT "ryhmaKayttaja_fk0" FOREIGN KEY ("kayttaja_id") REFERENCES webt."kayttaja"("id");
ALTER TABLE webt."ryhmaKayttaja" ADD CONSTRAINT "ryhmaKayttaja_fk1" FOREIGN KEY ("ryhma_id") REFERENCES webt."ryhma"("id");
ALTER TABLE webt."ui_settings" ADD CONSTRAINT "ui_settings_fk0" FOREIGN KEY ("kayttaja_id") REFERENCES webt."kayttaja"("id");
ALTER TABLE webt."redux_json" ADD CONSTRAINT "redux_json_fk0" FOREIGN KEY ("kayttaja_id") REFERENCES webt."kayttaja"("id");

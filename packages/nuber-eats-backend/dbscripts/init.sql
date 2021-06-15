DROP TABLE IF EXISTS "users";

CREATE TABLE "users" 
(
    "id" SERIAL NOT NULL, 
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
    "email" character varying NOT NULL, 
    "password" character varying NOT NULL, 
    "role" character varying NOT NULL, 
    CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
);

INSERT INTO "users"(email, password, role) VALUES 
('Jeremy Gu', '1234', 'owner'),
('Nicole Dong', '5678', 'owner');
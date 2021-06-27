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
('test1@test.com', '$2b$10$3OqozyrnB0Iuakk7yAnd4.GzNmlZA4heo1wyrLYiPGgRDrGqVnJF6', 'owner'),
('test2@test.com', '$2b$10$3OqozyrnB0Iuakk7yAnd4.GzNmlZA4heo1wyrLYiPGgRDrGqVnJF6', 'owner'); --- 123456
DROP TABLE IF EXISTS "restaurants";

CREATE TABLE "restaurants"
(
    "id" SERIAL NOT NULL, 
    "name" character varying NOT NULL, 
    "vegan_only" boolean NOT NULL, 
    "is_good" boolean, 
    CONSTRAINT "PK_649e250d8b8165cb406d99aa30f" PRIMARY KEY ("id")
);

INSERT INTO restaurants(name, vegan_only, is_good) VALUES 
('My Restaurant', false, true),
('Your Restaurant', false, false),
('New Restaurant', true, true);
USE testdb;

DROP TABLE IF EXISTS picklist_rankings;

CREATE TABLE picklist_rankings(
    id                       INT NOT NULL AUTO_INCREMENT,
    event_key                VARCHAR(10) NOT NULL,
    team_number              SMALLINT NOT NULL,
    first_pick_ranking       SMALLINT NOT NULL DEFAULT 0,
    second_pick_ranking      SMALLINT NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uq_event_team (event_key, team_number)
);

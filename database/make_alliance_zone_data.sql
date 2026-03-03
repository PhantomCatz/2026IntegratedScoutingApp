USE frcdb;

DROP TABLE IF EXISTS alliance_zone_data;

CREATE TABLE alliance_zone_data (
    
    id                                INT NOT NULL AUTO_INCREMENT,
    event_key                         VARCHAR(13) NOT NULL,
    team_number1                       INT NOT NULL,
    team_number2                       INT NOT NULL,
    team_number3                       INT NOT NULL,
    scouter_initials                  VARCHAR(4) NOT NULL,
    comp_level                        VARCHAR(30) NOT NULL,
    match_number                      SMALLINT NOT NULL,
    robot_alliance                    VARCHAR(50) NOT NULL,
    red_alliance                    VARCHAR(50) NOT NULL,
    blue_alliance                    VARCHAR(50) NOT NULL,
    -- Notes
    
    comments                          VARCHAR(1000) NOT NULL,
    team1value                         VARCHAR(50) NOT NULL,
    team2value                         VARCHAR(50) NOT NULL,
    team3value                         VARCHAR(50) NOT NULL,

    
    PRIMARY KEY (id)
);

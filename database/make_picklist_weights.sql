USE testdb;

DROP TABLE IF EXISTS picklist_weights;

-- robot_position: 1 = first pick weights, 2 = second pick weights
CREATE TABLE picklist_weights(
    id                              INT NOT NULL AUTO_INCREMENT,
    event_key                       VARCHAR(10) NOT NULL,
    robot_position                  SMALLINT NOT NULL,
    auton_fuel_scored_w             FLOAT NOT NULL DEFAULT 0,
    auton_climb_successful_w        FLOAT NOT NULL DEFAULT 0,
    teleop_fuel_scored_w            FLOAT NOT NULL DEFAULT 0,
    teleop_fuel_hoarded_w           FLOAT NOT NULL DEFAULT 0,
    endgame_climb_successful_w      FLOAT NOT NULL DEFAULT 0,
    overall_robot_died_w            FLOAT NOT NULL DEFAULT 0.75,
    overall_defended_others_w       FLOAT NOT NULL DEFAULT 0,
    robot_appeared_w                FLOAT NOT NULL DEFAULT 1,

    PRIMARY KEY (id),
    UNIQUE KEY uq_event_position (event_key, robot_position)
);

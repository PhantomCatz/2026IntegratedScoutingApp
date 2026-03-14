import * as TbaApi from './tbaApi';
import * as TbaRequest from './tbaRequest';

export type Tinyint = 0 | 1;

export type MatchEntry = {
    id:                           number;
    event_key:                    TbaApi.EventKey,
    team_number:                  number,
    scouter_initials:             string,
    comp_level:                   TbaApi.Comp_Level,
    match_number:                 number,
    robot_position:               TbaRequest.RobotPosition,
    auton_fuel_scored:            number,
    auton_shoot_location:         string,
    auton_intake_location:        string,
    auton_climb_attempted:        Tinyint,
    auton_climb_successful:       Tinyint,
    teleop_fuel_scored:           number,
    teleop_fuel_hoarded_amount:   string,
    teleop_primary_hoard_type:    string,
    endgame_climb_attempted:      Tinyint,
    endgame_climb_level:          string,
    endgame_climb_successful:     Tinyint,
    overall_robot_died:           Tinyint,
    overall_defended_others:      Tinyint,
    overall_was_defended:         Tinyint,
    overall_defended:             string,
    overall_defended_by:          string,
    overall_path_to_neutral_zone: string,
    overall_shot_while_moving:    Tinyint,
    overall_shot_hoarded_pieces:  Tinyint,
    overall_comments:             string,
    robot_appeared:               Tinyint,
};
export type StrategicEntry = {
    id:               number;
    event_key:        TbaApi.EventKey;
    team_number:      number;
    scouter_initials: string;
    comp_level:       TbaApi.Comp_Level;
    match_number:     number;
    robot_position:   TbaRequest.RobotPosition;
    comments:         string;
};
export type PitDataEntry = {
    id:                          number;
    event_key:                   string;
    team_number:                 number;
    scouter_initials:            string;
    robot_weight:                number;
    drive_train_type:            string;
    driving_motor_type:          string;
    number_of_driving_motors:    number;
    wheel_type:                  string;
    fuel_intake_location:        string;
    intake_type:                 string;
    intake_width:                string;
    max_fuel_capacity:           number;
    max_shot_range:              string;
    trench_capability:           Tinyint;
    climb_during_auto:           Tinyint;
    can_climb_l1:                Tinyint;
    can_climb_l2:                Tinyint;
    can_climb_l3:                Tinyint;
    pit_organization:            number;
    team_safety:                 number;
    team_workmanship:            number;
    gracious_professionalism:    number;
    any_electrical_issues:       string;
    comments:                    string;
};

export type PitPictureEntry = {
    id:               number;
    event_key:        TbaApi.EventKey;
    team_number:      number;
    scouter_initials: string;
    robot_image_uri:  string;
}

export type PitDataFullEntry = PitDataEntry & { robot_image_uri: string };

export type AllianceZoneEntry = {
    id:               number;
    event_key:        TbaApi.EventKey,
    team_number1:     number,
    team_number2:     number,
    team_number3:     number,
    scouter_initials: string ,
    comp_level:       TbaApi.Comp_Level,
    match_number:     number,
    robot_alliance:   TbaApi.AllianceColor,
    red_alliance:     string,
    blue_alliance:    string,
    comments:         string,
    team1value:       string,
    team2value:       string,
    team3value:       string,
}

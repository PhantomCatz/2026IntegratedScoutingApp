import type * as TbaApi from './tbaApi';
import type * as TbaRequest from './tbaRequest';
import type * as Database from './database';

export type PreMatch = {
	scouter_initials: string,
	comp_level: TbaApi.Comp_Level,
	match_number: number,
	robot_position: TbaRequest.RobotPosition,
	red_alliance: string,
	blue_alliance: string,
	team_override: number | null,
};

export type AutonMatch = {
	auton_fuel_scored: number,
	auton_fuel_score_multiplier: string,
	auton_shoot_location: string[]
	auton_intake_location: string[]
	auton_climb_attempted: boolean,
	auton_climb_successful: boolean,
};

export type TeleopMatch = {
	teleop_fuel_scored: number,
	teleop_fuel_score_multiplier: string,

export type EndgameMatch = {
	endgame_coral_intake_capability: string,
	endgame_algae_intake_capability: string,
	endgame_climb_successful: boolean,
	endgame_climb_type: string,
	endgame_climb_time: number,
};

export type OverallMatch = {
	overall_robot_died: boolean;
	overall_defended_others: boolean;
	overall_defended: number[];
	overall_was_defended: boolean;
	overall_defended_by: number[];
	overall_penalties_incurred: string;
	overall_pushing: number;
	overall_driver_skill: number;
	overall_major_penalties: number;
	overall_minor_penalties: number;
	overall_counter_defense: number;
	overall_defense_quality: number;
	overall_comments: string;
}

export type All = PreMatch & AutonMatch & TeleopMatch & EndgameMatch & OverallMatch;

// TODO: red_alliance, blue_alliance ????
export type SubmitBody = {
	event_key: string,
	team_number: number,
	scouter_initials: string,
	comp_level: string,
	match_number: number,
	robot_position: string,
	auton_fuel_scored: number,
	auton_shoot_location: string,
	auton_intake_location: string,
	auton_climb_attempted: Database.Tinyint,
	auton_climb_successful: Database.Tinyint,
	teleop_fuel_scored: number,
	endgame_coral_intake_capability: string,
	endgame_algae_intake_capability: string,
	endgame_climb_successful: Database.Tinyint,
	endgame_climb_type: string,
	endgame_climb_time: number,
	overall_robot_died: Database.Tinyint,
	overall_defended_others: Database.Tinyint,
	overall_was_defended: Database.Tinyint,
	overall_defended: string,
	overall_defended_by: string,
	overall_pushing: number,
	overall_defense_quality: number,
	overall_counter_defense: number,
	overall_driver_skill: number,
	overall_major_penalties: number,
	overall_minor_penalties: number,
	overall_penalties_incurred: string,
	overall_comments: string,
	robot_appeared: Database.Tinyint,
}

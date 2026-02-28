

import * as TbaApi from './tbaApi';
import * as TbaRequest from './tbaRequest';

export type Pre = {
   
    scouter_initials: string;
    comp_level: TbaApi.Comp_Level;
    match_number: number;
    robot_alliance: TbaApi.AllianceColor;
    red_alliance: string;
    blue_alliance: string;
};

export type AllianceZone = {
    comments: string;
    team1Value: "best" | "middle" | "worst";  // radio value
    team2Value: "best" | "middle" | "worst";
    team3Value: "best" | "middle" | "worst";
};

export type Alliance = Pre & AllianceZone;

export type SubmitBody = {
    event_key: TbaApi.EventKey;
    team_number1: number;
    team_number2: number;
    team_number3: number;
    scouter_initials: string;
    comp_level: TbaApi.Comp_Level;
    match_number: number;
    robot_alliance: TbaApi.AllianceColor;
    red_alliance: string;
    blue_alliance: string;
    comments: string;
    team1Value: "best" | "middle" | "worst";
    team2Value: "best" | "middle" | "worst";
    team3Value: "best" | "middle" | "worst";
    
};



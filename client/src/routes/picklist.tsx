import "../public/stylesheets/pitLookup.css";
import { useEffect, useState } from "react";
import { useLocalStorage } from "react-use";
import Header from "../parts/header";
import { getAllTeams } from "../utils/tbaRequest.ts";
import PitTabs from "../parts/pitTabs";
import { NumberInput } from "../parts/formItems";
import { getFieldAccessor } from "../parts/formItems";
import { Tabs } from "../parts/tabs";
import Constants from "../utils/constants";
import { Checkbox } from "../parts/formItems";
import { assertString, assertTinyInt } from "../types/assertions";
import { useParams } from "react-router-dom";

import type * as TbaApi from "../types/tbaApi";
import type { TabItem, TabItems } from "../parts/tabs";
import type * as Database from "../types/database";
import Table from "../parts/table";


function Picklist(): React.ReactElement {
    const DATA_COLUMNS = {
        "": {
            "Team": "team_number",
            "Match Number": "match_number",
            "Auto Fuel Scored": "auton_fuel_scored",
            "Auton Climb Attempted": "auton_climb_attempted",
            "Auton Climb Successful": "auton_climb_successful",
            "Teleop Fuel Scored": "teleop_fuel_scored",
            "Hoard Amount": "teleop_fuel_hoarded_amount",
            "Primary Hoard Type": "teleop_primary_hoard_type",
            "Climb Type": "endgame_climb_level",
            "Climb Successful": "endgame_climb_successful",
            "Shot While Moving": "overall_shot_while_moving",
            "Defended Others": "overall_defended_others",
            "Was Defended": "overall_was_defended",
            "Event Key": "event_key",
            "Team Number": "team_number",
            "Scouter Initials": "scouter_initials",
            "Competition Level": "comp_level",
            "Robot Position": "robot_position",
            "Endgame Climb Attempted": "endgame_climb_attempted",
            "Robot Died": "overall_robot_died",
            "Robots Defended": "overall_defended",
            "Robots Defended By": "overall_defended_by",
            "Robot Appeaered": "robot_appeared",
        },
    } as const;

    type Props = {
        title: string;
    };

    const [sortState, setSortState] = useState<SortState>(null);
    const [tabNumber, setTabNumber] = useState("1");
    const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>("eventKey", Constants.EVENT_KEY);
    const tabItems: TabItems = [
		{
			key: "1",
			label: "First Pick",
			children: firstPick(),
		},
		{
			key: "2",
			label: "Second Pick",
			children: secondPick(),
		},
		{
			key: "3",
			label: "Data Dump",
			children: dataDump(),
		},
		{
			key: "4",
			label: "Comments",
			children: comments(),
		},
		{
			key: "5",
			label: "Weights",
			children: weights(),
		}
	];

    if (!_eventKey) {
		throw new Error("Could not get event key");
	}

    type SortKey = keyof PicklistRow | "pickRank";
    type SortDirection = "asc" | "desc";
    type SortState = { key: SortKey; direction: SortDirection } | null;
    type PickRank = { [teamNumber: string]: number | "" };
    type Column = {
	key: SortKey;
	label: string;
	sortable: boolean;
    };
    type team = {
            team_number: number;
            auton_fuel_scored: number[];
            teleop_fuel_scored: number[];
            teleop_fuel_hoarded_amount: number[];
            overall_robot_died: number[];
            overall_defended_others: number[];
            overall_was_defended: number[];
            overall_shot_while_moving: number[];
    }

    function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
        if (a == null && b == null) {
            return 0;
        }
        if (a == null) {
            return 1;
        }
        if (b == null) {
            return -1;
        }
        if (typeof a === "number" && typeof b === "number") {
            return a - b;
        }
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    }

    function firstPick(): React.ReactElement {
        type PicklistRow = {
            teamNumber: number;
            tbaRanking: number | null;
            autonAvg: number | null;
            teleopAvg: number | null;
            iegr: number | null;
            sotm: string;
            restriction: string;
            drivetrain: string;
            deathRate: number | null;
        };

        const COLUMNS: Column[] = [
            { key: "teamNumber", label: "Team #", sortable: true },
            { key: "tbaRanking", label: "TBA ranking", sortable: true },
            { key: "pickRanking", label: "Pick ranking", sortable: true },
            { key: "autonAvg", label: "Auton avg", sortable: true },
            { key: "teleopAvg", label: "Teleop avg", sortable: true },
            { key: "iegr", label: "IEGR", sortable: true },
            { key: "sotm", label: "SOTM", sortable: true },
            { key: "restriction", label: "Restriction", sortable: true },
            { key: "drivetrain", label: "Drivetrain", sortable: true },
            { key: "deathRate", label: "Death rate", sortable: true },
        ];
        
        return(
            <>
            <table>
                <thead>
                    {COLUMNS.map((column) => (
                        <th key={column.key.toString()} onClick={() => setSortState({ key: column.key, direction: sortState?.key === column.key && sortState.direction === "asc" ? "desc" : "asc" })}>
                            {column.label}
                            {sortState?.key === column.key && (sortState.direction === "asc" ? " ▲" : " ▼")}
                        </th>
                    ))}
                </thead>
            </table>
            </>
        );
    }
    function secondPick(): React.ReactElement {
        type PicklistRow = {
            teamNumber: number;
            iegr: number | null;
            hoard: string;
            defense: string;
            restriction: string;
            deathRate: number | null;
            motorType: string;
            drivetrain: string;
        };

        const COLUMNS: Column[] = [
            { key: "teamNumber", label: "Team #", sortable: true },
            { key: "pickRanking", label: "Pick ranking", sortable: true },
            { key: "iegr", label: "IEGR", sortable: true },
            { key: "hoard", label: "Hoard", sortable: true },
            { key: "defense", label: "Defense", sortable: true },
            { key: "restriction", label: "Restriction", sortable: true },
            { key: "deathRate", label: "Death rate", sortable: true },
            { key: "motorType", label: "Motor Type", sortable: true },
            { key: "drivetrain", label: "Drivetrain", sortable: true },
        ];
        
        return(
            <>
            <table>
                <thead>
                    {COLUMNS.map((column) => (
                        <th key={column.key.toString()} onClick={() => setSortState({ key: column.key, direction: sortState?.key === column.key && sortState.direction === "asc" ? "desc" : "asc" })}>
                            {column.label}
                            {sortState?.key === column.key && (sortState.direction === "asc" ? " ▲" : " ▼")}
                        </th>
                    ))}
                </thead>
            </table>
            </>
        );
    }


        

    function dataDump(props: Props): React.ReactElement {
        const [loading, setLoading] = useState(true);
        const [matchData, setMatchData] = useState<{ [key in keyof Database.MatchEntry]: React.ReactNode }[] | null>(null);
        const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>("eventKey", Constants.EVENT_KEY);

        if (!_eventKey) {
            throw new Error("Could not get event key");
        }

        const eventKey = _eventKey;

        
        useEffect(() => {
            async function fetchData(): Promise<void> {
                try {
                    if (!Constants.SERVER_ADDRESS) {
                        console.error("Could not get fetch link. Check .env");
                        return;
                    }
                    const fetchLink = Constants.SERVER_ADDRESS + eventKey + "/match/all/";

                    const response = await fetch(fetchLink);
                    const data = (await response.json()) as Database.MatchEntry[];

                    const table = [];

                    if (!data.length) {
                        window.alert("Could not get data");
                        return;
                    }

                    const teams: team[] = [];
                    for (const match of data) {
                        const team = match.team_number;
                        const fuelHoarded = match.teleop_fuel_hoarded_amount === "High" ? 4
                                        : match.teleop_fuel_hoarded_amount === "Medium" ? 3
                                        : match.teleop_fuel_hoarded_amount === "Low" ? 2
                                        : match.teleop_fuel_hoarded_amount === "None" ? 1
                                        : 0;
                        if(!teams[team]){
                            const newteam: team = {
                                team_number: team,
                                auton_fuel_scored: [match.auton_fuel_scored],
                                teleop_fuel_scored: [match.teleop_fuel_scored],
                                teleop_fuel_hoarded_amount: [fuelHoarded],
                                overall_robot_died: [match.overall_robot_died],
                                overall_defended_others: [match.overall_defended_others],
                                overall_was_defended: [match.overall_was_defended],
                                overall_shot_while_moving: [match.overall_shot_while_moving],
                            }
                            teams[team] = newteam;
                        }
                    }

                    // for (const match of data) {
                    //     const row: {
                    //         key: string;
                    //         [key: string]: React.ReactNode | undefined;
                    //     } = { key: "" };

                    //     for (const field in match) {
                    //         const result = getCellValue(field, match[field as keyof typeof match] as unknown);
                    //         row[field as keyof typeof match] = result;
                    //     }
                    //     const key = `${match.id}`;
                    //     row["key"] = key;

                    //     table.push(row);
                    // }

                    setMatchData(table);
                } catch (err) {
                    console.error("Error occured when getting data: ", err);
                } finally {
                    setLoading(false);
                }
            }
            void fetchData();
        });
        useEffect(() => {
            fixFields();
        }, [matchData]);

        const fixedFields: number[] = [];

        function getCellValue(field: string, value: unknown): React.ReactNode {
            let result: React.ReactNode = null;

            if (value === null || value === undefined) {
                console.error(`field=`, field);
                console.error(`value=`, value);
            }

            switch (field) {
                case "robot_appeared":
                case "auton_climb_attempted":
                case "auton_climb_successful":
                case "endgame_climb_attempted":
                case "endgame_climb_successful":
                case "overall_robot_died":
                case "overall_defended_others":
                case "overall_was_defended":
                case "overall_shot_while_moving":
                case "overall_shot_hoarded_pieces": {
                    assertTinyInt(value);

                    const newValue = Boolean(value);

                    result = <Checkbox disabled defaultValue={newValue} />;
                    break;
                }
                case "overall_penalties_incurred":
                case "event_key":
                case "team_number":
                case "scouter_initials":
                case "comp_level":
                case "match_number":
                case "robot_position":
                case "auton_fuel_scored":
                case "auton_shoot_location":
                case "auton_intake_location":
                case "teleop_fuel_scored":
                case "teleop_fuel_hoarded_amount":
                case "teleop_primary_hoard_type":
                case "endgame_climb_level":
                case "overall_defended":
                case "overall_defended_by":
                case "overall_path_to_neutral_zone": {
                    result = (value || "").toString();
                    break;
                }
                case "id":
                    break;
                default:
                    console.error(`Unknown field`, field);
                    break;
            }

            return result;
        }

        function fixFields(): void {
            for (const num of fixedFields) {
                document
                    .querySelectorAll(`.matchDataTable table tr > :nth-child(${num + 1}):not([scope=colgroup])`)
                    .forEach((x) => {
                        x.classList.add("cell__fixed");
                    });
            }
        }

        return (
            <>
                <match-data>
                    {loading && <h2>Loading...</h2>}

                    {matchData ? (
                        <Table data={matchData} columns={DATA_COLUMNS} getKey={(row) => (row.id as unknown as number).toString()} />
                    ) : (
                        <h1>No Data QAQ</h1>
                    )}
                </match-data>
            </>
        );
    }
    
    function comments(): React.ReactElement {}
    function weights(): React.ReactElement {}

    return (
        <>
        <Header name={"Picklist"} back={"#"} />
        <picklist>
            <Tabs defaultActiveKey="1" activeKey={tabNumber} items={tabItems} onChange={setTabNumber} />
        </picklist>
        </>
    );
}

export default Picklist;
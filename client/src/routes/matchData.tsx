import '../public/stylesheets/matchData.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Table from '../parts/table';
import { Checkbox } from '../parts/formItems';
import Header from '../parts/header';

import Constants from '../utils/constants';
import { assertNumber, assertString, assertTinyInt  } from '../types/assertions';

import type * as Database from '../types/database';

const DATA_COLUMNS = {
	"Match Identifier": {
		"Team Number": "team_number",
		"Match Event": "event_key",
		"Scouter Initials": "scouter_initials",
		"Match Level": "comp_level",
		"Match #": "match_number",
		"Robot Appeared": "robot_appeared",
	},
	"Teleop": {
		"Coral L4": "teleop_coral_l4",
		"Coral L3": "teleop_coral_l3",
		"Coral L2": "teleop_coral_l2",
		"Coral L1": "teleop_coral_l1",
		"Algae Net": "teleop_algae_net",
		"Algae Scored Processor": "teleop_algae_scored_processor",
	},
	"Auton": {
		"Left Starting Line": "auton_leave_starting_line",
		"Coral L4": "auton_coral_l4",
		"Coral L3": "auton_coral_l3",
		"Coral L2": "auton_coral_l2",
		"Coral L1": "auton_coral_l1",
		"Algae Net": "auton_algae_net",
		"Algae Scored Processor": "auton_algae_scored_processor",
	},
	"Endgame": {
		"Coral Intake": "endgame_coral_intake_capability",
		"Coral Station": "endgame_coral_station",
		"Algae Intake": "endgame_algae_intake_capability",
		"Climb Successful": "endgame_climb_successful",
		"Climb Type": "endgame_climb_type",
		"Climb Time": "endgame_climb_time",
	},
	"Overall": {
		"Robot Died": "overall_robot_died",
		"Defended Others": "overall_defended_others",
		"Was Defended": "overall_was_defended",
		"Defended": "overall_defended",
		"Defended by": "overall_defended_by",
		"Pushing": "overall_pushing",
		"Defense Quality": "overall_defense_quality",
		"Counter Defense": "overall_counter_defense",
		"Driver Skill": "overall_driver_skill",
		"Major Penalties": "overall_major_penalties",
		"Minor Penalties": "overall_minor_penalties",
		"Penalties Incurred": "overall_penalties_incurred",
		"Comments": "overall_comments",
	},
} as const;

const FIXED_FIELDS: { readonly [key: string]: true | undefined } = {
	"match_number": true,
} as const;

type Props = {
	title: string
};

function MatchData(props: Props): React.ReactElement {
	const { teamNumber } = useParams();
	const [loading, setLoading] = useState(true);
	const [matchData, setMatchData] = useState<{ [key in keyof Database.MatchEntry]: React.ReactNode}[] | null>(null);

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	useEffect(() => {
		async function fetchData(teamNumber: number): Promise<void> {
			try {
				let fetchLink = Constants.SERVER_ADDRESS;

				if(!fetchLink) {
					console.error("Could not get fetch link. Check .env");
					return;
				}

				fetchLink += "reqType=getTeam";
				fetchLink += `&team1=${teamNumber}`;

				const response = await (await fetch(fetchLink)).json() as { [teamIndex: number]: Database.MatchEntry[] | undefined };

				const table = [];
				const data  = response[1];
				if(!data) {
					window.alert("Could not get data");
					return;
				}

				for (const match of data) {
					const row = {};

					for (const field in match) {
						const [result, location, hasValue] = getCellValue(field, match[field], match);

						if(location === null) {
							continue;
						}
						row[location] = result;
					}
					const key = `${match.id}`;
					row["key"] = key;

					table.push(row);
				}

				setMatchData(table);
			}
			catch (err) {
				console.error("Error occured when getting data: ", err);
			}
			finally {
				setLoading(false);
			}
		}
		if (teamNumber) {
			void fetchData(parseInt(teamNumber));
		}
	}, [teamNumber]);
	useEffect(() => {
		fixFields();
	}, [matchData]);

	const fixedFields: number[] = [];

	function getCellValue(field: string, value: unknown, data) {
		let result: unknown = null;
		let location = "";
		let hasValue = false;

		if(value === null || value === undefined) {
			console.error(`field=`, field);
			console.error(`value=`, value);
		}

		switch(field) {
			case "auton_coral_scored_l4":
			case "auton_coral_scored_l3":
			case "auton_coral_scored_l2":
			case "auton_coral_scored_l1":
			case "auton_algae_scored_net":
			case "teleop_coral_scored_l4":
			case "teleop_coral_scored_l3":
			case "teleop_coral_scored_l2":
			case "teleop_coral_scored_l1":
			case "teleop_algae_scored_net": {
				assertNumber(value);

				const scored = value;
				// :eyes:
				const missed = data[field.replace("scored", "missed") as keyof typeof data];
				const total = scored + missed;

				result = `${scored}/${total}`;
				location = field.replace("_scored", "");
				hasValue = true;
				break;
			}
			case "robot_appeared":
			case "auton_leave_starting_line":
			case "endgame_climb_successful":
			case "overall_robot_died":
			case "overall_defended_others":
			case "overall_was_defended": {
				assertTinyInt(value);

				const newValue = Boolean(value);

				result = (<Checkbox disabled defaultValue={newValue} />);
				location = field;
				// Negate certain values
				hasValue = ["robot_appeared"].includes(field) !== newValue;
				break;
			}
			case "overall_penalties_incurred":
			case "overall_comments": {
				assertString(value);

				const text = (value || "").replaceAll("\\n", "\n");
				result = (<p className="commentBox">
					{text}
				</p>);
				location = field;
				hasValue = Boolean(value);
				break;
			}
			case "team_number":
			case "event_key":
			case "scouter_initials":
			case "comp_level":
			case "match_number":
			case "robot_position":
			case "robot_starting_position":
			case "auton_algae_scored_processor":
			case "teleop_algae_scored_processor":
			case "endgame_coral_intake_capability":
			case "endgame_coral_station":
			case "endgame_algae_intake_capability":
			case "endgame_climb_type":
			case "endgame_climb_time":
			case "overall_defended":
			case "overall_defended_by":
			case "overall_pushing":
			case "overall_defense_quality":
			case "overall_counter_defense":
			case "overall_driver_skill":
			case "overall_major_penalties":
			case "overall_minor_penalties": {
				result = (value || "").toString();
				location = field;
				hasValue = Boolean(value);
				break;
			}
			case "id":
			case "auton_coral_missed_l4":
			case "auton_coral_missed_l3":
			case "auton_coral_missed_l2":
			case "auton_coral_missed_l1":
			case "auton_algae_missed_net":
			case "teleop_coral_missed_l4":
			case "teleop_coral_missed_l3":
			case "teleop_coral_missed_l2":
			case "teleop_coral_missed_l1":
			case "teleop_algae_missed_net":
				break;
			default:
				console.error(`Unknown field`, field);
				break;
		}

		return [result, location, hasValue];
	}

	function fixFields(): void {
		for(const num of fixedFields) {
			document.querySelectorAll(`.matchDataTable table tr > :nth-child(${num + 1}):not([scope=colgroup])`)
				.forEach((x) => {
					x.classList.add("cell__fixed");
				});
		}
	}

	return (
		<>
			<Header name={`Data for ${teamNumber}`} back="#scoutingapp/lookup/match" />

			<match-data>
				<h2 style={{ whiteSpace: 'pre-line' }}>{loading ? "Loading..." : ""}</h2>

				{matchData ?
					<Table
						data={matchData}
						columns={DATA_COLUMNS}
						getKey={(row) => (row.id as unknown as number).toString()}
					/>
					:
					<h1>No Data QAQ</h1>
				}
			</match-data>
		</>
	);
}

export default MatchData;

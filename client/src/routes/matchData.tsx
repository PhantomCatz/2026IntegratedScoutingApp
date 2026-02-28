import '../public/stylesheets/matchData.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Table from '../parts/table';
import { Checkbox } from '../parts/formItems';
import Header from '../parts/header';

import Constants from '../utils/constants';
import { assertString, assertTinyInt  } from '../types/assertions';

import type * as Database from '../types/database';

const DATA_COLUMNS = {
	"": {
		"Match Number": "match_number",
		"Auto Fuel Scored": "auton_fuel_scored",
		"Auton Climb Attempted": "auton_climb_attempted",
		"Auton Climb Successful": "auton_climb_successful",
		"Teleop Fuel Scored": "teleop_fuel_scored",
		"Hoard Amount": "teleop_fuel_hoarded_amount",
		"Primary Hoard Type": "teleop_primary_hoard_type",
		"Climb Type": "endgame_climb_level",
		"Climb Successful": "endgame_climb_successful",
		"Auton Shoot Location": "auton_shoot_location",
		"Auton Intake Location": "auton_intake_location",
		"Shot While Moving": "overall_shot_while_moving",
		"Path to Neutral Zone": "overall_path_to_neutral_zone",
		"Shot Hoarded Pieces": "overall_shot_hoarded_pieces",
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
		"Comments": "overall_comments",
		"Robot Appeaered": "robot_appeared",
	}
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
					const row: {
						key: string,
						[key: string]: React.ReactNode | undefined,
					} = { key: "" };

					for (const field in match) {
						const result = getCellValue(field, match[field as keyof typeof match] as unknown);
						row[field as keyof typeof match] = result;
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

	function getCellValue(field: string, value: unknown): React.ReactNode {
		let result: React.ReactNode = null;

		if(value === null || value === undefined) {
			console.error(`field=`, field);
			console.error(`value=`, value);
		}

		switch(field) {
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

				result = (<Checkbox disabled defaultValue={newValue} />);
				break;
			}
			case "overall_penalties_incurred":
			case "overall_comments": {
				assertString(value);

				const text = (value || "").replaceAll("\\n", "\n");
				result = (<p className="commentBox">
					{text}
				</p>);
				break;
			}
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
				{ loading &&
				<h2>Loading...</h2>
				}

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

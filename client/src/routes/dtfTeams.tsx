import '../public/stylesheets/dtfTeams.css';
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Input, TextArea } from '../parts/formItems';
import { Tabs } from '../parts/tabs';
import Header from '../parts/header';
import ChartComponent from '../parts/dtfChart';
import PitTabs from '../parts/pitTabs';
import StrategicTabs from '../parts/strategicTabs';
import Constants from '../utils/constants';
import * as Utils from '../utils/utils';

import type { TabItems, } from '../parts/tabs';
import type * as Database from '../types/database';
import type * as TbaApi from '../types/tbaApi';
import { assertNumber, assertString, assertNonNull } from '../types/assertions';

type Props = {
	title: string;
};
type MatchData = {
	[team_index: number]: Database.MatchEntry[]
};
type AggregateData = {
	// Auton
	"avg_fuel_scored": number,
	"climb_percentage": number,
	

	// Teleop
	"team_fuel_scored": number,
	"team_fuel_hoard": string,
	"team_climb_level_1_percentage": number,
	"team_climb_level_2_percentage": number,
	"team_climb_level_3_percentage": number,
	
	// Overall
	"team_robot_died_percentage": number,
	"team_intake_fuel_type": string,
	//does it passes the trench
	"team_pass_trench": boolean,
	"team_fuel_capacity": number,
	"team_shoot_while_moving": boolean,
	"team_hoard_type": string,
	"team_robot_comments": string,
	
	//Summary
	"alliance_avg_fuel_score": number,
	"alliance_avg_climb_score": number,
	"alliance_avg_auton_fuel_count": number
	"alliance_1_total_score": number,
	
	"team_1_avg_score": number,
	"team_1_climb_score": number,
	"team_1_fuel_score": number,
	
	"team_2_avg_score": number,
	"team_2_climb_score": number,
	"team_2_fuel_score": number,

	"team_3_avg_score": number,
	"team_3_climb_score": number,
	"team_3_fuel_score": number,

	"alliance_2_total_score": number,
	
	"team_4_avg_score": number,
	"team_4_climb_score": number,
	"team_4_fuel_score": number,

	"team_5_avg_score": number,
	"team_5_climb_score": number,
	"team_5_fuel_score": number,

	"team_6_avg_score": number,
	"team_6_climb_score": number,
	"team_6_fuel_score": number,
};

function DTFTeams(props: Props): React.ReactElement {
	const { teamParams } = useParams();
	const [loading, setLoading] = useState(false);
	const [tabItems, setTabItems] = useState<TabItems>([]);
	const [teamList, setTeamList] = useState<number[]>([]);
	const [teamIndex, setTeamIndex] = useState<{ [team: string]: number } | null>(null);
	const [teamsMatchData, setTeamsMatchData] = useState<{[index: number]: Database.MatchEntry[] | undefined} | null>(null);
	const [teamsStrategicData, setTeamsStrategicData] = useState<{[index: string]: Database.StrategicEntry[]} | null>(null);

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	useEffect(() => {
		const teams = teamParams?.split(",").map(Utils.toNumber) || [];

		const inverse: { [team: string]: number } = {};

		for(let i = 0; i < teams.length; i++) {
			const num = teams[i];
			if(!num) {
				continue;
			}

			inverse[num] = i + 1;
		}

		setTeamList(teams);
		setTeamIndex(inverse);
	}, [teamParams]);
	useEffect(() => {
		let fetchLink = Constants.SERVER_ADDRESS;

		const teams = teamList;
		if(!teams.some(x => x)) {
			return;
		}

		if(!fetchLink) {
			console.error("Could not get fetch link; Check .env");
			return;
		}

		fetchLink += "reqType=getTeam"

		for(let i = 0; i < Constants.NUM_ALLIANCES * Constants.TEAMS_PER_ALLIANCE; i++) {
			if(teams[i]) {
				fetchLink += `&team${i+1}=${teams[i]}`;
			}
		}

		void (async function () {
			try {
				const response = await fetch(fetchLink);
				const data = await response.json() as MatchData;

				preprocessData(data);
				setTeamsMatchData(data);
			} catch (err: unknown) {
				console.error("Error fetching data. Is server on?", err);
			}
		})();

		fetchLink = Constants.SERVER_ADDRESS;
		fetchLink += "reqType=getTeamStrategic";

		void (async () => {
			try {
				const strategicData: { [teamIndex: number]: Database.StrategicEntry[] } = {};

				await Promise.all(teams.filter(team => team).map(async (team) => {
					const res = await fetch(fetchLink + `&team=${team}`);
					const data = await res.json() as Database.StrategicEntry[];
					strategicData[team] = data;
				}));

				preprocessData(strategicData);
				setTeamsStrategicData(strategicData);
			} catch(err) {
				console.error("An error occurred:", err);
			}
		})();
	}, [teamList]);
	useEffect(() => {
		getDTF(teamList);
	}, [teamsMatchData, teamsStrategicData]);

	function preprocessData(data: { [teamIndex: string]: { comp_level: TbaApi.Comp_Level, match_number: number}[]}): void {
		const matchLevelOrder = {
			"qm": 0,
			"qf": 1,
			"sf": 2,
			"f": 3,
			"ef": 4,
			// TODO: remove legacy mapping
			"Qualifications": 0,
			"Playoffs": 1,
			"Finals": 2,
		} as const;


		for(const teamIndex in data) {
			data[teamIndex].sort(function(a, b) {
				const matchLevelComp = matchLevelOrder[a.comp_level] - matchLevelOrder[b.comp_level];
				if(matchLevelComp !== 0) {
					return matchLevelComp;
				}
				return a.match_number - b.match_number;
			});
		}
	}
	function aggregateData(k: string, v: string | number | boolean | null | undefined, data: AggregateData): void {
		const l = data.match_count;
		if(v === null || v === undefined) {
			return;
		}
		switch(k) {
			// Average values
			case "avg_fuel_scored":
			case "climb_percentage":
				//auton
			case "team_fuel_scored":
			case "team_fuel_hoard":
			case "team_climb_level_1_percentage":
			case "team_climb_level_2_percentage":
			case "team_climb_level_3_percentage":
				//teleop
			case "team_robot_died_percentage":
			case "team_fuel_capacity":
				//overall
			case "alliance_avg_fuel_score":
			case "alliance_avg_climb_score":
			case "alliance_avg_auton_fuel_count":
				//alliance summary
			case "alliance_1_total_score":
			case "team_1_avg_score":
			case "team_1_climb_score":
			case "team_1_fuel_score":
			
			case "team_2_avg_score":
			case "team_2_climb_score":
			case "team_2_fuel_score":

			case "team_3_avg_score":
			case "team_3_climb_score":
			case "team_3_fuel_score":

			case "alliance_2_total_score":
			case "team_4_avg_score":
			case "team_4_climb_score":
			case "team_4_fuel_score":
			
			case "team_5_avg_score":
			case "team_5_climb_score":
			case "team_5_fuel_score":

			case "team_6_avg_score":
			case "team_6_climb_score":
			case "team_6_fuel_score":
				//entire summary
				assertNumber(data[k])
				assertNumber(v);
				if(l) {
					data[k] += v/l;
				}
				break;
			// Summative values
			case "team_pass_trench":
			case "team_shoot_while_moving":
				assertNumber(data[k])
				assertNumber(v);
				data[k] += v;
				break;
			case "overall_comments":
				assertString(v);
				assertString(data[k]);
				data[k] += v.replace("\\n", "\n") + "\n";
				break;
			// Special Values
			case "team_intake_fuel_type":
			{
				// TODO: refactor/remove?
				let change = 0;
				if(!data[k]) {
					change = 1;
				} else if(data[k] === "No Intake") {
					change = 1;
				} else if(data[k] === "Both") {
					change = -1;
				} else if(v === "No Intake") {
					change = -1;
				} else if(v === "Both") {
					change = 1;
				} else if(data[k] === v) {
					change = -1;
				}
				assertString(data[k]);
				assertString(v);
				switch(change) {
					case -1:
						break;
					case 1:
						data[k] = v;
						break;
					default:
						console.error(`Team has conflicting ${k} types: `, data[k], v);
						data[k] = "Both";
						break;
				}
				break;
			}
			// Default: Do nothing
			default:
				//console.error("did nothing for", k);
				break;
		}
		
	}
	//function getScore calculates the score by doing the calculation (the score the robot gets by doing something) * (how many times the robot did that)
	function getScore(k: string, v: AggregateData[keyof AggregateData]): number {
		const map = {
			"auton_coral_scored_l4": 7,
			"auton_coral_scored_l3": 6,
			"auton_coral_scored_l2": 4,
			"auton_coral_scored_l1": 3,
			"auton_algae_scored_net": 4,
			"auton_algae_scored_processor": 6,
			"teleop_coral_scored_l4": 5,
			"teleop_coral_scored_l3": 4,
			"teleop_coral_scored_l2": 3,
			"teleop_coral_scored_l1": 2,
			"teleop_algae_scored_net": 4,
			"teleop_algae_scored_processor": 6,
		} as const;

		if(map[k]) {
			return map[k] * v;
		} else if(k === "endgame_climb_type") {
			switch(v) {
				case "Deep Hang":
					return 12;
				case "Shallow Hang":
					return 6;
				case "Park":
					return 2;
				default:
					return 0;
			}
		} else if(k === "auton_leave_starting_line" && v) {
			return 3;
		}
		return 0;
	}
	function mergeTeamData(matches: Database.MatchEntry[]): AggregateData {
		const data: AggregateData = {
			"auton_leave_starting_line": false,
			"auton_coral_scored_l4": 0,
			"auton_coral_l4_total": 0,
			//"auton_coral_missed_l4": 0,
			"auton_coral_scored_l3": 0,
			"auton_coral_l3_total": 0,
			//"auton_coral_missed_l3": 0,
			"auton_coral_scored_l2": 0,
			"auton_coral_l2_total": 0,
			//"auton_coral_missed_l2": 0,
			"auton_coral_scored_l1": 0,
			"auton_coral_l1_total": 0,
			//"auton_coral_missed_l1": 0,
			"auton_algae_scored_net": 0,
			"auton_algae_missed_net": 0,
			"auton_algae_net_total": 0,
			"auton_algae_scored_processor": 0,

			// Teleop
			"teleop_coral_scored_l4": 0,
			"teleop_coral_l4_total": 0,
			//"teleop_coral_missed_l4": 0,
			"teleop_coral_scored_l3": 0,
			"teleop_coral_l3_total": 0,
			//"teleop_coral_missed_l3": 0,
			"teleop_coral_scored_l2": 0,
			"teleop_coral_l2_total": 0,
			//"teleop_coral_missed_l2": 0,
			"teleop_coral_scored_l1": 0,
			"teleop_coral_l1_total": 0,
			//"teleop_coral_missed_l1": 0,
			"teleop_algae_scored_net": 0,
			"teleop_algae_missed_net": 0,
			"teleop_algae_net_total": 0,
			"teleop_algae_scored_processor": 0,

			// Endgame
			"endgame_coral_intake_capability": "",
			//"endgame_coral_station": event.endgame_coral_station
			"endgame_algae_intake_capability": "",

			// "endgame_climb_successful": event.endgame_climb_successful,
			"endgame_climb_type": "",

			"endgame_climb_time": 0,
			// Overall
			"overall_robot_died": 0,
			"overall_defended_others": 0,
			"overall_was_defended": 0,
			// "overall_defended": [],
			// "overall_defended_by": [],
			"overall_pushing": 0,
			"overall_counter_defense": 0,
			"overall_driver_skill": 0,
			"overall_major_penalties": 0,
			"overall_minor_penalties": 0,
			// "overall_penalties_incurred": string,
			"overall_comments": "",

			"robot_played": false,

			"endgame_climb_successful_total": 0,

			"total_score": 0,
			"average_score": 0,
			"match_count": 0,
		};
		data.match_count = matches.filter((x) => x.robot_appeared).length;
		const l = matches.length;

		if(l === 0) {
			return data;
		}
		for(const match of matches) {
			if(!match.robot_appeared) {
				continue;
			}
			for(const [k, v] of Object.entries(match)) {
				aggregateData(k, v, data);
				data.total_score += getScore(k, v);
			}
		}
		data.average_score = data.match_count ?
			data.total_score / data.match_count :
			0;

		for(const [k, v] of Object.entries(data)) {
			if(typeof v === "number") {
				// :eyes: :eyes: :eyes:
				data[k as keyof typeof data] = Math.round(v) as never;
			}
		}
		return data;
	}

	function getAllianceTabItems(teams: number[], persistentData: { [team: string]: AggregateData | undefined }, index: number): TabItems {
		const tabs: TabItems = [];
		const alliancePersistentData: AggregateData[] = [];

		if(!teamIndex || !teamsMatchData || !teamsStrategicData) {
			return tabs;
		}

		let teamCount = (index - 1) * Constants.TEAMS_PER_ALLIANCE;
		for (const team of teams) {
			teamCount++;
			if(!team) {
				continue;
			}

			const dataIndex = teamIndex[team];
			const teamMatches = teamsMatchData[dataIndex];
			const teamTabs: TabItems = [];

			const strategicData = teamsStrategicData[team];
			// let pitData = await PitTabs(Number(team));

			const strategicTabs: TabItems = StrategicTabs({ data: strategicData });

			if(teamMatches && teamMatches.length) {
				const data = mergeTeamData(teamMatches);

				persistentData[team] = data;
				alliancePersistentData.push(data);

				teamTabs.push({ key: "Charts", label: "Charts", children:
						<>
							<ChartComponent teamMatches={teamMatches} teamStrategic={strategicData}/>
						</>
				});

				teamTabs.push({ key: "Auton", label: "Auton", children:
						<>
							<div style={{display: 'flex',}}>
								<div style={{flexGrow: 1, }}>
									<h2>L1 avg</h2>
									<Input disabled defaultValue={`${data.auton_coral_scored_l1}/${data.auton_coral_l1_total}`} />
								</div>
								<div style={{flexGrow: 1, }}>
									<h2>L2 avg</h2>
									<Input disabled defaultValue={`${data.auton_coral_scored_l2}/${data.auton_coral_l2_total}`} />
								</div>
							</div>
							<div style={{display: 'flex',}}>
								<div style={{flexGrow: 1, }}>
									<h2>L3 avg</h2>
									<Input disabled defaultValue={`${data.auton_coral_scored_l3}/${data.auton_coral_l3_total}`} />
								</div>
								<div style={{flexGrow: 1, }}>
									<h2>L4 avg</h2>
									<Input disabled defaultValue={`${data.auton_coral_scored_l4}/${data.auton_coral_l4_total}`} />
								</div>
							</div>

							<h2>Avg Algae Processed</h2>
							<Input disabled defaultValue={data.auton_algae_scored_processor.toString()} />
							<h2>Avg Algae Net</h2>
							<Input disabled defaultValue={`${data.auton_algae_scored_net}/${data.auton_algae_net_total}`} />
						</>
				});

				teamTabs.push({ key: "Teleop/End", label: "Teleop/End", children:
						<>
							<div style={{display: 'flex',}}>
								<div style={{flexGrow: 1, }}>
									<h2>L1 avg</h2>
									<Input disabled defaultValue={`${data.teleop_coral_scored_l1}/${data.teleop_coral_l1_total}`} />
								</div>
								<div style={{flexGrow: 1, }}>
									<h2>L2 avg</h2>
									<Input disabled defaultValue={`${data.teleop_coral_scored_l2}/${data.teleop_coral_l2_total}`} />
								</div>
							</div>
							<div style={{display: 'flex',}}>
								<div style={{flexGrow: 1, }}>
									<h2>L3 avg</h2>
									<Input disabled defaultValue={`${data.teleop_coral_scored_l3}/${data.teleop_coral_l3_total}`} />
								</div>
								<div style={{flexGrow: 1, }}>
									<h2>L4 avg</h2>
									<Input disabled defaultValue={`${data.teleop_coral_scored_l4}/${data.teleop_coral_l4_total}`} />
								</div>
							</div>
							<h2>Avg Algae Processed</h2>
							<Input disabled defaultValue={data.teleop_algae_scored_processor.toString()} />
							<h2>Avg Algae Net</h2>
							<Input disabled defaultValue={`${data.teleop_algae_scored_net}/${data.teleop_algae_net_total}`} />
							<h2>Climb Type</h2>
							<Input disabled defaultValue={data.endgame_climb_type} />
							<h2>Avg Climb Success</h2>
							<Input disabled defaultValue={data.endgame_climb_successful_total.toString()} />
							<h2>Avg Climb Time</h2>
							<Input disabled defaultValue={data.endgame_climb_time.toString()} />
						</>
				});

				teamTabs.push({ key: "OA", label: "OA", children:
						<>
							<h2>Matches Played</h2>
							<Input disabled defaultValue={`${data.match_count}/${teamMatches.length}`} />
							<h2>Robot Died (counter: matches)</h2>
							<Input disabled defaultValue={data.overall_robot_died.toString()} />
							<h2>Intake Algae Type</h2>
							<Input disabled defaultValue={data.endgame_algae_intake_capability} />
							<h2>Intake Coral Type</h2>
							<Input disabled defaultValue={data.endgame_coral_intake_capability} />
							<h2>Robot Comments</h2>
							<TextArea disabled defaultValue={data.overall_comments} />
						</>
				});
			} else {
				teamTabs.push({ key: "NoData", label: "No Data", children:
						<p className={"errorLabel"}>No Data for team {team}</p>,
				});
			}

			/*
			teamTabs.push({ key: "Pit", label: "Pit", children:
			<>
			{ pitData &&
			<Tabs items={pitData} className="tabs" />
			|| <p className={"errorLabel"}>No Pit Data</p>
			}
			</>
			});
			 */
			teamTabs.push({ key: "Strategic", label: "Strategic", children:
					<>
						{ strategicTabs.length ?
							<Tabs items={strategicTabs} />
							: <p className={"errorLabel"}>No Strategic Data</p>
						}
					</>
			});

			tabs.push({ key: `${team}|${teamCount}`, label: team.toString(), children:
					<>
						<Tabs items={teamTabs} />
					</>
			});
		}

		const averageScores: React.ReactElement[] = [];
		const driverSkills: React.ReactElement[] = [];

		let totalAverage = 0;

		for(let i = 0; i < Constants.TEAMS_PER_ALLIANCE; i++) {
			const team = alliancePersistentData[i];
			const teamNumber = teams[i];
			const shouldDisplay = alliancePersistentData[i]?.match_count > i;

			if(!shouldDisplay) {
				continue;
			}

			totalAverage += (team).average_score;

			averageScores.push(
				<div key={`${teamNumber}AverageScoreSkill`}>
					<h2>Team {teamNumber} Avg Score</h2>
					<Input disabled defaultValue={team.average_score.toString()} />
				</div>
			);
			driverSkills.push(
				<div style={{ display: 'flex', flexDirection: 'column' }} key={`${teamNumber}DriverSkill`}>
					<h2 className='summary_text'>{teamNumber}</h2>
					<Input disabled defaultValue={team.overall_driver_skill.toString()} />
				</div>
			);
		}

		tabs.push({ key: "Summary", label: "Summary", children:
				<>
					<h2>Average Alliance Score</h2>
					<Input disabled defaultValue={totalAverage.toString()} />
					{averageScores}
					<h2>Driver Skill</h2>
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						{driverSkills}
					</div>
				</>
		});

		return tabs;
	}
	function getDTF(teams: number[]): void {
		setLoading(true);

		if(!teamsMatchData || !teamsStrategicData) {
			console.error("Could not load DTF. No data found");
			return;
		}
		console.log("Loaded data.");

		try {
			const persistentData: { [teamNumber: number]: AggregateData | undefined } = {};
			const allianceTabs = [];

			for(let i = 1; i <= Constants.NUM_ALLIANCES; i++) {
				const alliance = teams.slice((i - 1) * Constants.TEAMS_PER_ALLIANCE, i * Constants.TEAMS_PER_ALLIANCE);

				const allianceTabItems = getAllianceTabItems(alliance, persistentData, i);

				allianceTabs.push({ key: `Alliance${i}`, label: `Alliance ${i}`, children:
						<>
							<Tabs items={allianceTabItems} />
						</>
				});
			}

			const allianceAverageScores: React.ReactElement[] = [];
			const averageScores: React.ReactElement[] = [];

			for(let i = 0; i < Constants.NUM_ALLIANCES; i++) {
				const averageScoresGroup: React.ReactElement[] = [];
				let allianceTotalAverage = 0;

				for(let j = 0; j < Constants.TEAMS_PER_ALLIANCE; j++) {
					const index = i * Constants.TEAMS_PER_ALLIANCE + j;
					const teamNumber = teamList[index];

					if(!teamNumber) {
						continue;
					}

					const data = persistentData[teamNumber];

					assertNonNull(data);

					averageScoresGroup.push(
						<div key={`${i}|${j}`}>
							<h2>Team {teamNumber} Average Score</h2>
							<Input disabled defaultValue={data.average_score.toString()} />
						</div>
					);

					allianceTotalAverage += data.average_score;
				}

				averageScores.push(
					<div key={`allianceRobotAverages${i + 1}`}>
						<h2>Alliance {i + 1} Robots</h2>
						{averageScoresGroup}
					</div>
				);
				allianceAverageScores.push(
					<div key={`allianceAverage${i + 1}`}>
						<h2>Alliance {i + 1} Average Score</h2>
						<Input disabled defaultValue={allianceTotalAverage.toString()} />
					</div>
				);

			}

			allianceTabs.push({ key: "OverallSummary", label: "Overall Summary", children:
					<>
						{allianceAverageScores}
						{averageScores}
					</>
			});

			setTabItems(allianceTabs);
		} catch (error) {
			console.error("Error fetching team data:", error);
		}
		setLoading(false);
	}
	return (
		<>
			<Header name={"Drive Team Feeder"} back={"#"} />

			<dtf-teams>
				<h2 style={{ display: loading ? 'inherit' : 'none' }}>Loading data...</h2>
				{ tabItems.length ?
					<Tabs items={tabItems} />
					:
					<h1>No Data QAQ</h1>
				}
			</dtf-teams>
		</>
	);

}
export default DTFTeams;

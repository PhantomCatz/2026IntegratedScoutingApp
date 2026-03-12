import '../public/stylesheets/dtfTeams.css';
import '../public/stylesheets/style.css';
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Input, TextArea, Checkbox } from '../parts/formItems';
import { Tabs } from '../parts/tabs';
import Header from '../parts/header';
import { DTFChartComponent, DTFAutonChartComponent, DTFTeleopChartComponent } from '../parts/dtfChart';
import StrategicTabs from '../parts/strategicTabs';
import Constants from '../utils/constants';
import * as Utils from '../utils/utils';

import type { TabItems, } from '../parts/tabs';
import type * as Database from '../types/database';
import type * as TbaApi from '../types/tbaApi';
import type { TypedKey } from '../types/utilityTypes';
import { assertNumber, assertString, assertNonNull, assertEquals, assertTinyInt } from '../types/assertions';

type Props = {
	title: string;
};
type MatchData = {
	[team_index: number]: Database.MatchEntry[]
};
type AggregateData = {
	"auton_fuel_scored": number;
	"auton_shoot_location": Set<string>;
	"auton_intake_location": Set<string>;
	"auton_climb_attempted": number;
	"auton_climb_successful": number;

	"teleop_fuel_scored": number;
	"teleop_fuel_hoarded_amount": Map<string, number>;
	"teleop_primary_hoard_type": Map<string, number>;

	"endgame_climb_attempted": Map<string, number>;
	"endgame_climb_level": Map<string, number>; //TODO: stronger typing for form options? so that we can type maps at compile time
	"endgame_climb_successful": Map<string, number>;

	"overall_robot_died": number;
	"overall_shot_while_moving": Map<Database.Tinyint, number>;

	"match_count": number;
	"robot_comments": string;
	"total_score": number;
	"average_score": number;

	"trench_capability": boolean;
	"intake_type": Set<string>;
	"fuel_capacity": number;

	"average_fuel_count": number,
	"average_auton_fuel_count": number,
	"average_climb_score": number,
};

enum ActionMapping {
	ADD = 'add',
	AVERAGE = 'average',
	STRING_ADD = 'string_add',
	SELECT_OPTIONS = 'select_options',
	COUNT_OPTIONS = 'count_options',
	COUNT_BOOLEAN = 'count_boolean',

	ENDGAME_CLIMB = 'endgame_climb',
};
const KEY_MAPPINGS: { [key: string]: ActionMapping | undefined } = {
	"auton_fuel_scored": ActionMapping.AVERAGE,
	// "auton_shoot_location": ActionMapping.SELECT_OPTIONS,
	// "auton_intake_location": ActionMapping.SELECT_OPTIONS,
	"auton_climb_attempted": ActionMapping.ADD,
	"auton_climb_successful": ActionMapping.ADD,

	"teleop_fuel_scored": ActionMapping.AVERAGE,
	"teleop_fuel_hoarded_amount": ActionMapping.COUNT_OPTIONS,
	"teleop_primary_hoard_type": ActionMapping.COUNT_OPTIONS,

	"endgame_climb_level": ActionMapping.ENDGAME_CLIMB, //TODO: stronger typing for form options? so that we can type maps at compile time

	"overall_robot_died": ActionMapping.AVERAGE,
	"overall_shot_while_moving": ActionMapping.COUNT_BOOLEAN,
} as const;

type PermittedKey<T> = TypedKey<AggregateData, T>
const ACTIONS = {
	[ActionMapping.ADD]: function(key: PermittedKey<number>, value: number, data: AggregateData): void {
		if(!Object.hasOwn(data, key)) {
			data[key] = 0;
		}
		data[key] += value;
	},
	[ActionMapping.AVERAGE]: function(key: PermittedKey<number>, value: number, data: AggregateData): void {
		if(!Object.hasOwn(data, key)) {
			data[key] = 0;
		}
		data[key] += value / data.match_count;
	},
	[ActionMapping.STRING_ADD]: function(key: PermittedKey<string>, value: string, data: AggregateData): void {
		if(!Object.hasOwn(data, key)) {
			data[key] = "";
		}
		data[key] += value.replace("\\n", "\n") + "\n";
	},
	[ActionMapping.SELECT_OPTIONS]: function(key: PermittedKey<Set<string>>, value: string, data: AggregateData): void {
		if(!Object.hasOwn(data, key)) {
			data[key] = new Set<string>();
		}

		data[key].add(value);
	},
	[ActionMapping.COUNT_OPTIONS]: function(key: PermittedKey<Map<string, number>>, value: string, data: AggregateData): void {
		if(!Object.hasOwn(data, key)) {
			data[key] = new Map<string, number>();
		}

		data[key].set(value,
			(data[key].get(value) ?? 0) + 1
		);
	},
	[ActionMapping.COUNT_BOOLEAN]: function(key: PermittedKey<Map<Database.Tinyint, number>>, value: Database.Tinyint, data: AggregateData): void {
		if(!Object.hasOwn(data, key)) {
			data[key] = new Map<Database.Tinyint, number>();
		}

		data[key].set(value,
			(data[key].get(value) ?? 0) + 1
		);
	},

	// idk...
	[ActionMapping.ENDGAME_CLIMB]: function(_key: 'endgame_climb_level', value: string, data: AggregateData, match: Database.MatchEntry): void {
		if(!Object.hasOwn(data, 'endgame_climb_level')) {
			data['endgame_climb_level'] = new Map<string, number>();
		}
		if(!Object.hasOwn(data, 'endgame_climb_attempted')) {
			data['endgame_climb_attempted'] = new Map<string, number>();
		}
		if(!Object.hasOwn(data, 'endgame_climb_successful')) {
			data['endgame_climb_successful'] = new Map<string, number>();
		}

		if(!match.endgame_climb_attempted) {
			return;
		}

		data['endgame_climb_level'].set(value, (data['endgame_climb_level'].get(value) ?? 0) + 1);
		data['endgame_climb_attempted'].set(value,
			(data['endgame_climb_attempted'].get(value) ?? 0) + 1
		);
		data['endgame_climb_successful'].set(value,
			(data['endgame_climb_successful'].get(value) ?? 0) + match.endgame_climb_successful
		);
	},
} as const;

function DTFTeams(props: Props): React.ReactElement {
	const { teamParams } = useParams();
	const [isLoading, setIsLoading] = useState(false);
	const [tabItems, setTabItems] = useState<TabItems>([]);
	const [teamList, setTeamList] = useState<number[]>([]);
	const [teamIndex, setTeamIndex] = useState<{ [team: string]: number } | null>(null);
	const [teamsMatchData, setTeamsMatchData] = useState<{[index: number]: Database.MatchEntry[] | undefined} | null>(null);
	const [teamsStrategicData, setTeamsStrategicData] = useState<{[index: string]: Database.StrategicEntry[]} | null>(null);
	const [teamsPitData, setTeamsPitData] = useState<{[index: string]: Database.PitDataEntry[]} | null>(null);

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
		const fetchLink = Constants.SERVER_ADDRESS;

		const teams = teamList;
		if(!teams.some(x => x)) {
			return;
		}

		if(!fetchLink) {
			console.error("Could not get fetch link; Check .env");
			return;
		}

		setIsLoading(true);

		void Promise.all([
			(async function() {
				let matchDataFetchLink = fetchLink + "reqType=getTeam";

				for(let i = 0; i < Constants.NUM_ALLIANCES * Constants.TEAMS_PER_ALLIANCE; i++) {
					if(teams[i]) {
						matchDataFetchLink += `&team${i+1}=${teams[i]}`;
					}
				}

				try {
					const response = await fetch(matchDataFetchLink);
					const data = await response.json() as MatchData;

					sortByMatches(data);
					setTeamsMatchData(data);
				} catch (err: unknown) {
					console.error("Error fetching data. Is server on?", err);
				}
			})(),
			(async function() {
				const strategicDataFetchLink = fetchLink + "reqType=getTeamStrategic";
				try {
					const strategicData: { [teamIndex: number]: Database.StrategicEntry[] } = {};

					await Promise.all(teams.filter(team => team).map(async (team) => {
						const res = await fetch(strategicDataFetchLink + `&team=${team}`);
						const data = await res.json() as Database.StrategicEntry[];
						strategicData[team] = data;
					}));

					sortByMatches(strategicData);
					setTeamsStrategicData(strategicData);
				} catch(err) {
					console.error("An error occurred:", err);
				}
			})(),
			(async function() {
				const pitDataFetchLink = fetchLink + "reqType=getTeamPitData";
				try {
					const pitData: { [teamIndex: number]: Database.PitDataEntry[] } = {};

					await Promise.all(teams.filter(team => team).map(async (team) => {
						const res = await fetch(pitDataFetchLink + `&team=${team}`);
						const data = await res.json() as Database.PitDataEntry[];
						pitData[team] = data;
					}));

					setTeamsPitData(pitData);
				} catch(err) {
					console.error("An error occurred:", err);
				}
			})(),
		])
			.finally(() => {
				setIsLoading(false);
			})
	}, [teamList]);
	useEffect(() => {
		getDTF(teamList);
	}, [teamsMatchData, teamsStrategicData, teamsPitData]);

	function sortByMatches(data: { [teamIndex: string]: { comp_level: TbaApi.Comp_Level, match_number: number}[]}): void {
		const matchLevelOrder = {
			"qm": 0,
			"qf": 1,
			"sf": 2,
			"f": 3,
			"ef": 4,
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
	function dispatchValueAction(k: keyof AggregateData,
			v: Database.MatchEntry[keyof Database.MatchEntry],
			data: AggregateData,
			match: Database.MatchEntry): void {
		assertNonNull(v);

		const action = KEY_MAPPINGS[k];

		if(!action) {
			return;
		}

		switch(action) {
			case ActionMapping.ADD: {
				assertNumber(v);

				ACTIONS[ActionMapping.ADD](k as PermittedKey<number>, v, data);
				break;
			}
			case ActionMapping.AVERAGE: {
				assertNumber(v);

				ACTIONS[ActionMapping.AVERAGE](k as PermittedKey<number>, v, data);
				break;
			}
			case ActionMapping.STRING_ADD: {
				assertString(v);

				ACTIONS[ActionMapping.STRING_ADD](k as PermittedKey<string>, v, data);
				break;
			}
			case ActionMapping.SELECT_OPTIONS: {
				assertString(v);

				ACTIONS[ActionMapping.SELECT_OPTIONS](k as PermittedKey<Set<string>>, v, data);
				break;
			}
			case ActionMapping.COUNT_OPTIONS: {
				assertString(v);

				ACTIONS[ActionMapping.COUNT_OPTIONS](k as PermittedKey<Map<string, number>>, v, data);
				break;
			}
			case ActionMapping.COUNT_BOOLEAN: {
				assertTinyInt(v);

				ACTIONS[ActionMapping.COUNT_BOOLEAN](k as PermittedKey<Map<Database.Tinyint, number>>, v, data);
				break;
			}
			case ActionMapping.ENDGAME_CLIMB: {
				assertEquals('endgame_climb_level', k);
				assertString(v);

				ACTIONS[ActionMapping.ENDGAME_CLIMB](k, v, data, match);
				break;
			}
			default:
				break;
		}
	}
	function getScore(k: keyof AggregateData, v: AggregateData[keyof AggregateData], match: Database.MatchEntry): number {
		const map: { [key: string]: number | undefined } = {
			"auton_fuel_scored": 1,
			"teleop_fuel_scored": 1,
			"auton_climb_successful": 15, // works because booleans are stored as tinyints
		} as const;

		let score = 0;

		if(map[k]) {
			assertNumber(v);

			score = map[k] * v;
		} else if(k === "endgame_climb_level" && match.endgame_climb_successful) {
			switch(v) {
				case 'Level_3':
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					score =  30;
					break;
				case 'Level_2':
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					score = 20;
					break;
				case 'Level_1':
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					score = 10;
					break;
				default:
					break;
			}
		}
		return score;
	}
	function mergeTeamMatches(matches: Database.MatchEntry[]): AggregateData {
		const data: AggregateData = {
			"auton_fuel_scored": 0,
			"auton_shoot_location": new Set<string>(),
			"auton_intake_location": new Set<string>(),
			"auton_climb_attempted": 0,
			"auton_climb_successful": 0,

			"teleop_fuel_scored": 0,
			"teleop_fuel_hoarded_amount": new Map<string, number>(),
			"teleop_primary_hoard_type": new Map<string, number>(),

			"endgame_climb_attempted": new Map<string, number>(),
			"endgame_climb_level": new Map<string, number>(), //TODO: stronger typing for form options? so that we can type maps at compile time
			"endgame_climb_successful": new Map<string, number>(),

			"overall_robot_died": 0,
			"overall_shot_while_moving": new Map<Database.Tinyint, number>(),

			"match_count": 0,
			"robot_comments": "",
			"total_score": 0,
			"average_score": 0,

			"trench_capability": false,
			"intake_type": new Set<string>(),
			"fuel_capacity": 0,

			"average_fuel_count": 0,
			"average_auton_fuel_count": 0,
			"average_climb_score": 0,
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
				dispatchValueAction(k as keyof AggregateData, v, data, match);
				data.total_score += getScore(k as keyof AggregateData, v, match);
			}

			data.average_climb_score += getScore('auton_climb_successful', match.auton_climb_successful, match) / data.match_count || 0;
			data.average_climb_score += getScore('endgame_climb_level', match.auton_climb_successful, match) / data.match_count || 0;
		}
		data.average_fuel_count += data.auton_fuel_scored + data.teleop_fuel_scored;
		data.average_auton_fuel_count += data.auton_fuel_scored;
		data.average_score = data.total_score / data.match_count || 0;

		for(const [k, v] of Object.entries(data)) {
			if(typeof v === "number") {
				// :eyes:
				data[k as PermittedKey<number>] = Math.round(v);
			}
		}
		return data;
	}

	function getAllianceTabItems(teams: number[], persistentData: { [team: string]: AggregateData | undefined }, index: number): TabItems {
		const tabs: TabItems = [];
		const alliancePersistentData: AggregateData[] = [];

		if(!teamIndex || !teamsMatchData || !teamsStrategicData || !teamsPitData) {
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

			const pitData = teamsPitData[team];

			if(teamMatches && teamMatches.length) {
				const data = mergeTeamMatches(teamMatches);

				strategicData.forEach(row => {
					// :eyes:
					dispatchValueAction('robot_comments', row.comments, data, null as never);
				});

				const latestPitMatch = pitData[pitData.length - 1] as Database.PitDataEntry | undefined;

				data.fuel_capacity = latestPitMatch?.max_fuel_capacity ?? 0;
				data.intake_type = new Set(latestPitMatch?.intake_type.split(","));

				persistentData[team] = data;
				alliancePersistentData.push(data);

				teamTabs.push({ key: "Auton", label: "Auton", children:
						<>
							<div className="inputRow">
								<Input title="Avg Fuel Scored" disabled defaultValue={data.auton_fuel_scored.toString()} />
								<Input title="Climb Percentage" disabled defaultValue={Utils.toPercentageString(data.auton_climb_successful/data.auton_climb_attempted)} />
							</div>
							<DTFAutonChartComponent teamMatches={teamMatches} teamStrategic={strategicData}/>
						</>
				});

				const teleop_fuel_hoarded_amount_ordering = {
					"High": 3,
					"Medium": 2,
					"Low": 1,
					"None": 0,
				} as const;
				teamTabs.push({ key: "Teleop/End", label: "Teleop/End", children:
						<>
							<div className="inputRow">
								<Input title="Fuel Scored" disabled defaultValue={data.teleop_fuel_scored.toString()} />
								<Input title="Fuel Hoard" disabled defaultValue={Utils.maximumOfMap(data.teleop_fuel_hoarded_amount, teleop_fuel_hoarded_amount_ordering)} />
							</div>
							<DTFTeleopChartComponent teamMatches={teamMatches} teamStrategic={strategicData}/>
							<div className="inputRow">
								<Input title="Climb L1" disabled defaultValue={`${data.endgame_climb_successful.get('L1') ?? 0}/${data.endgame_climb_attempted.get('L1') ?? 0}`} />
								<Input title="Climb L2" disabled defaultValue={`${data.endgame_climb_successful.get('L2') ?? 0}/${data.endgame_climb_attempted.get('L2') ?? 0}`} />
								<Input title="Climb L3" disabled defaultValue={`${data.endgame_climb_successful.get('L3') ?? 0}/${data.endgame_climb_attempted.get('L3') ?? 0}`} />
							</div>
						</>
				});

				const teleop_primary_hoard_type_ordering = {
					"Shoot_Hoard": 2,
					"Shoot Hoard": 2,
					"Push_Hoard": 1,
					"Push Hoard": 1,
					"Dump_Hoard": 0,
					"Dump Hoard": 0,
				} as const;
				teamTabs.push({ key: "OA", label: "OA", children:
						<>
							<Input title="Robot Died (counter: matches)" disabled defaultValue={data.overall_robot_died.toString()} />
							<Input title="Intake Fuel Type" disabled defaultValue={data.intake_type.entries().toArray().join(', ')} />
							<div className="inputRow">
								<Checkbox title="Trench" align="center" disabled defaultValue={data.trench_capability} />
								<Input title="Fuel Capacity" disabled defaultValue={data.fuel_capacity.toString()} />
							</div>
							<div className="inputRow">
								<Checkbox title="Shoot While Moving" align="center" disabled defaultValue={(data.overall_shot_while_moving.get(1) ?? 0) > 0} />
								<Input title="Hoard Type" disabled defaultValue={Utils.maximumOfMap(data.teleop_primary_hoard_type, teleop_primary_hoard_type_ordering)} />
							</div>
							<TextArea title="Robot Comments" disabled defaultValue={data.robot_comments} />
						</>
				});
			} else {
				teamTabs.push({ key: "NoData", label: "No Data", children:
						<p className={"errorLabel"}>No Data for team {team}</p>,
				});
			}

			tabs.push({ key: `${team}|${teamCount}`, label: team.toString(), children:
					<>
						<Tabs items={teamTabs} />
					</>
			});
		}

		const averageScores: React.ReactElement[] = [];
		const averageFuelPerSecondItems: React.ReactElement[] = [];

		let totalAverageFuelCount = 0;
		let totalAverageClimbScore = 0;
		let totalAverageAutonFuelCount = 0;

		for(let i = 0; i < Constants.TEAMS_PER_ALLIANCE; i++) {
			const team = alliancePersistentData[i] as AggregateData | null;

			if(!team) {
				continue;
			}

			const teamNumber = teams[i];
			const shouldDisplay = team.match_count > i;

			if(!shouldDisplay) {
				continue;
			}

			totalAverageFuelCount = team.average_fuel_count;
			totalAverageClimbScore = team.average_climb_score;
			totalAverageAutonFuelCount = team.average_auton_fuel_count;

			averageScores.push(
				<div key={`${teamNumber}AverageScoreSkill`}>
					<h2>Team {teamNumber} Avg Score</h2>
					<Input disabled defaultValue={team.average_score.toString()} />
				</div>
			);

			const ACTIVE_SECONDS_PER_MATCH = 75;

			averageFuelPerSecondItems.push(
				<Input key={teamNumber} title={`Team ${teamNumber}`} disabled defaultValue={Utils.round(team.teleop_fuel_scored / ACTIVE_SECONDS_PER_MATCH, 2).toString()} />
			);
		}

		tabs.push({ key: "Summary", label: "Summary", children:
				<>
					<Input title="Alliance Avg Fuel Count" disabled defaultValue={totalAverageFuelCount.toString()} />
					<Input title="Alliance Avg Climb Score" disabled defaultValue={totalAverageClimbScore.toString()} />
					<Input title="Alliance Avg Auton Fuel Count" disabled defaultValue={totalAverageAutonFuelCount.toString()} />
					<h2>Average Fuel Per Second</h2>

					<div className="inputRow">
						{averageFuelPerSecondItems}
					</div>
				</>
		});

		return tabs;
	}
	function getDTF(teams: number[]): void {
		if(isLoading) {
			return;
		}
		setIsLoading(true);

		if(!teamsMatchData || !teamsStrategicData || !teamsPitData) {
			console.error("Could not load DTF. No data found");
			setIsLoading(false);
			return;
		}
		console.info("Loaded data.");

		try {
			const persistentData: { [teamNumber: number]: AggregateData | undefined } = {};
			const allianceTabs: TabItems = [];

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

			for(let i = 0; i < Constants.NUM_ALLIANCES; i++) {
				const averageScoresGroup: React.ReactElement[] = [];
				let allianceTotalAverage = 0;

				for(let j = 0; j < Constants.TEAMS_PER_ALLIANCE; j++) {
					const index = i * Constants.TEAMS_PER_ALLIANCE + j;
					const teamNumber = teamList[index];

					if(!teamNumber) {
						continue;
					}

					const team = persistentData[teamNumber];

					if(!team) {
						continue;
					}

					assertNonNull(team);

					averageScoresGroup.push(
						<div key={`${i}|${j}`}>
							<h2>Team {teamNumber}</h2>
							<div className='inputRow'>
								<Input title="Average Score" disabled defaultValue={team.average_score.toString()} />
								<Input title="Climb Score" disabled defaultValue={team.average_climb_score.toString()} />
								<Input title="Fuel Score" disabled defaultValue={team.average_fuel_count.toString()} />
							</div>
						</div>
					);

					allianceTotalAverage += team.average_score;
				}

				allianceAverageScores.push(
					<div key={`allianceAverage${i + 1}`}>
						<Input title={`Alliance ${i + 1} Total Score`} disabled defaultValue={allianceTotalAverage.toString()} />
						<h2>Alliance {i + 1} Robots</h2>
						{averageScoresGroup}
						<hr/>
					</div>
				);

			}

			allianceTabs.push({ key: "OverallSummary", label: "Overall Summary", children:
					<>
						{allianceAverageScores}
					</>
			});

			setTabItems(allianceTabs);
		} catch (error) {
			console.error("Error fetching team data:", error);
		}

		setIsLoading(false);
	}
	return (
		<>
			<Header name={"Drive Team Feeder"} back={"#dtf"} />

			<dtf-teams>
				<h2 style={{ display: isLoading ? 'inherit' : 'none' }}>Loading data...</h2>
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

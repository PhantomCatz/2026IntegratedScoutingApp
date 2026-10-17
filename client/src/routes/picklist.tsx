import "../public/stylesheets/picklist.css";
import { createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "react-use";
import Header from "../parts/header";
import { getAllTeams, getEventRankings } from "../utils/tbaRequest.ts";
import { NumberInput } from "../parts/formItems";
import { Tabs } from "../parts/tabs";
import Constants from "../utils/constants";
import type * as TbaApi from "../types/tbaApi";
import type { TabItems } from "../parts/tabs";
import type * as Database from "../types/database";
import Table from "../parts/table";

const NUMERIC_MATCH_FIELDS = ["auton_fuel_scored", "teleop_fuel_scored"] as const;

const BOOLEAN_MATCH_FIELDS = [
	"robot_appeared",
	"auton_climb_attempted",
	"auton_climb_successful",
	"endgame_climb_attempted",
	"endgame_climb_successful",
	"overall_robot_died",
	"overall_defended_others",
	"overall_was_defended",
	"overall_shot_while_moving",
	"overall_shot_hoarded_pieces",
] as const;

const PIT_NUMERIC_FIELDS = [
	"robot_weight",
    "number_of_driving_motors",
    "max_fuel_capacity",
] as const;

const PIT_STRING_FIELDS = [
	"drive_train_type",
	"driving_motor_type",
	"wheel_type",
	"fuel_intake_location",
	"intake_type",
	"intake_width",
	"max_shot_range",
	"any_electrical_issues",
] as const;

const PIT_BOOLEAN_FIELDS = [
    "auto_aim",
    "trench_capability",
    "climb_during_auto",
    "can_climb_l1",
    "can_climb_l2",
    "can_climb_l3",
] as const;

const DATA_DUMP_COLUMNS = {
	Match: {
		Team: "team_number",
		"Auto Fuel Scored": "auton_fuel_scored",
		"Teleop Fuel Scored": "teleop_fuel_scored",
		"Hoard Amount": "teleop_fuel_hoarded_amount",
		"Robot Appeared": "robot_appeared",
		"Auton Climb Attempted": "auton_climb_attempted",
		"Auton Climb Successful": "auton_climb_successful",
		"Endgame Climb Attempted": "endgame_climb_attempted",
		"Climb Successful": "endgame_climb_successful",
		"Robot Died": "overall_robot_died",
		"Defended Others": "overall_defended_others",
		"Was Defended": "overall_was_defended",
		"Shot While Moving": "overall_shot_while_moving",
	},
	Pit: {
		"Drive Train": "drive_train_type",
		"Motor Type": "driving_motor_type",
		"Wheel Type": "wheel_type",
		"Fuel Intake Location": "fuel_intake_location",
		"Intake Type": "intake_type",
		"Intake Width": "intake_width",
		"Max Shot Range": "max_shot_range",
        "Auto aim": "auto_aim",
        "Trench?":"trench_capability",
		"Electrical Issues": "any_electrical_issues",
	},
} as const;

const FIRST_PICK_COLUMNS = {
    Match: {
        "Team #": "team_number",
        "TBA Ranking": "tba_ranking",
        "Pick Ranking": "pick_ranking",
        "IEGR": "iegr",
		"R2 Weight": "overall_weight",
        "Auton Avg": "auton_fuel_scored",
        "Teleop Avg": "teleop_fuel_scored",
        "SOTM": "overall_shot_while_moving",
        "Death Rate": "overall_robot_died",
    },
    Pit: {
        "Drive Train": "drive_train_type",
        "Motor Type": "driving_motor_type",
        "Trench?": "trench_capability",
    }
} as const;

const SECOND_PICK_COLUMNS = {
    Match: {
        "Team #": "team_number",
        "TBA Ranking": "tba_ranking",
        "Pick Ranking": "pick_ranking",
        "IEGR": "iegr",
		"R3 Weight": "overall_weight",
        "Hoard": "teleop_fuel_hoarded_amount",
        "Defense": "overall_defended_others",
        "Death Rate": "overall_robot_died",
    },
    Pit: {
        "Drive Train": "drive_train_type",
        "Motor Type": "driving_motor_type",
        "Trench?": "trench_capability",
    },
} as const;

/** Weight DB columns → match average fields used in the weighted sum. */
const WEIGHT_AVG_MAP = [
	{ weight: "auton_fuel_scored_w", avg: "auton_fuel_scored" },
	{ weight: "auton_climb_successful_w", avg: "auton_climb_successful" },
	{ weight: "teleop_fuel_scored_w", avg: "teleop_fuel_scored" },
	{ weight: "teleop_fuel_hoarded_w", avg: "teleop_fuel_hoarded_amount" },
	{ weight: "endgame_climb_successful_w", avg: "endgame_climb_successful" },
	{ weight: "overall_robot_died_w", avg: "overall_robot_died" },
	{ weight: "overall_defended_others_w", avg: "overall_defended_others" },
	{ weight: "robot_appeared_w", avg: "robot_appeared" },
] as const;

const WEIGHT_FIELDS = [
	"auton_fuel_scored_w",
	"auton_climb_successful_w",
	"teleop_fuel_scored_w",
	"teleop_fuel_hoarded_w",
	"endgame_climb_successful_w",
	"overall_robot_died_w",
	"overall_defended_others_w",
	"robot_appeared_w",
] as const;

const WEIGHT_COLUMNS = {
	"": {
		Pick: "pick_label",
		"Auton Fuel": "auton_fuel_scored_w",
		"Auton Climb": "auton_climb_successful_w",
		"Teleop Fuel": "teleop_fuel_scored_w",
		Hoard: "teleop_fuel_hoarded_w",
		"Endgame Climb": "endgame_climb_successful_w",
		"Robot Died": "overall_robot_died_w",
		Defense: "overall_defended_others_w",
		Appeared: "robot_appeared_w",
	},
} as const;

type picklistRow = { [key: string]: React.ReactNode };
type PickRank = { [teamNumber: string]: number | "" };
type PicklistRankingEntry = {
	event_key: string;
	team_number: number;
	first_pick_ranking: number;
	second_pick_ranking: number;
};
type PicklistWeightsRow = {
	event_key: string;
	robot_position: number;
} & { [K in (typeof WEIGHT_FIELDS)[number]]: number };

type CommentRow = {
	id: string;
	comment_type: string;
	match_number: string;
	scouter_initials: string;
	comments: string;
};

const COMMENT_COLUMNS = {
	"": {
		Type: "comment_type",
		"Match Number": "match_number",
		Scouter: "scouter_initials",
		Comments: "comments",
	},
} as const;

function round3(n: number): number {
	return Math.round(n * 1000) / 1000;
}

/** Run async work over items with limited concurrency (avoids browser/server fetch pileups). */
async function mapInBatches<T, R>(
	items: T[],
	batchSize: number,
	fn: (item: T) => Promise<R | null>,
): Promise<R[]> {
	const results: R[] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map(async (item) => {
				try {
					return await fn(item);
				} catch (err) {
					console.error("Failed to fetch team data:", err);
					return null;
				}
			}),
		);
		for (const result of batchResults) {
			if (result != null) {
				results.push(result);
			}
		}
	}
	return results;
}

function emptyWeights(eventKey: string, robotPosition: 1 | 2): PicklistWeightsRow {
	const row = {
		event_key: eventKey,
		robot_position: robotPosition,
	} as PicklistWeightsRow;
	for (const field of WEIGHT_FIELDS) {
		row[field] = 0;
	}
	return row;
}

function parseAvgCell(value: React.ReactNode): number {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value !== "string" || value === "") {
		return 0;
	}
	if (value.endsWith("%")) {
		return (Number(value.slice(0, -1)) || 0) / 100;
	}
	return Number(value) || 0;
}
function computeOverallWeight(row: picklistRow, weights: PicklistWeightsRow | undefined): string {
	if (!weights) {
		return "";
	}
	let sum = 0;
	for (const { weight, avg } of WEIGHT_AVG_MAP) {
		if (weight === "robot_appeared_w") {
			continue;
		}
		sum += parseAvgCell(row[avg]) * Number(weights[weight] ?? 1);
	}
	sum *= parseAvgCell(row.robot_appeared) * Number(weights.robot_appeared_w ?? 1);
	return round3(sum).toString();
}

async function fetchPickWeights(eventKey: string): Promise<{ first: PicklistWeightsRow; second: PicklistWeightsRow }> {
	const first = emptyWeights(eventKey, 1);
	const second = emptyWeights(eventKey, 2);
	if (!Constants.SERVER_ADDRESS) {
		return { first, second };
	}
	const response = await fetch(Constants.SERVER_ADDRESS + eventKey + "/picklist/weights");
	const rows = (await response.json()) as PicklistWeightsRow[] | null;
	for (const row of rows ?? []) {
		if (row.robot_position === 1) {
			Object.assign(first, row, { robot_position: 1, event_key: eventKey });
		} else if (row.robot_position === 2) {
			Object.assign(second, row, { robot_position: 2, event_key: eventKey });
		}
	}
	return { first, second };
}

async function savePickWeights(row: PicklistWeightsRow): Promise<void> {
	if (!Constants.SERVER_ADDRESS) {
		return;
	}
	await fetch(Constants.SERVER_ADDRESS + "picklist/weights/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(row),
	});
}

function mapHoardAmount(value: string | null | undefined): number {
	if (!value) {
		return 0;
	}
	const normalized = value.trim().toLowerCase();
	if (normalized === "low") {
		return 1;
	}
	if (normalized === "med" || normalized === "medium") {
		return 2;
	}
	if (normalized === "high") {
		return 3;
	}
	return 0;
}

function averageMatchFields(
	matches: Database.MatchEntry[],
	teamNumber: number,
): picklistRow {
	const count = matches.length;
	const mean = (sum: number): number => round3(sum / count);
	const row: picklistRow = {
		id: teamNumber,
		team_number: teamNumber,
	};

	for (const field of NUMERIC_MATCH_FIELDS) {
		const sum = matches.reduce((acc, match) => acc + Number(match[field]), 0);
		row[field] = mean(sum).toString();
	}

	for (const field of BOOLEAN_MATCH_FIELDS) {
		const sum = matches.reduce((acc, match) => acc + Number(match[field]), 0);
		row[field] = (mean(sum)*100).toFixed(1).toString()+"%";
	}

	const hoardSum = matches.reduce((acc, match) => acc + mapHoardAmount(match.teleop_fuel_hoarded_amount), 0);
	row.teleop_fuel_hoarded_amount = mean(hoardSum).toString();

	const matchScores = matches
		.map((match) => Number(match.auton_fuel_scored) + Number(match.teleop_fuel_scored))
		.sort((a, b) => b - a);
	const topThree = matchScores.slice(0, 3);
	row.iegr = round3(topThree.reduce((acc, score) => acc + score, 0) / topThree.length).toString();

	return row;
}

function pitQualitativeFields(pitEntries: Database.PitDataEntry[]): picklistRow {
	const latest = pitEntries[pitEntries.length - 1];
	const row: picklistRow = {};
	if (!latest) {
		for (const field of PIT_STRING_FIELDS) {
			row[field] = "";
		}
		for (const field of PIT_BOOLEAN_FIELDS) {
			row[field] = "";
		}
		return row;
	}
	for (const field of PIT_STRING_FIELDS) {
		row[field] = (latest[field] ?? "").toString();
	}
	for (const field of PIT_BOOLEAN_FIELDS) {
		row[field] = latest[field] ? "Yes" : "No";
	}
	return row;
}

function pitNumericFields(pitEntries: Database.PitDataEntry[]): picklistRow {
	const latest = pitEntries[pitEntries.length - 1];
	const row: picklistRow = {};
	if (!latest) {
		for (const field of PIT_NUMERIC_FIELDS) {
			row[field] = "";
		}
		return row;
	}
	for (const field of PIT_NUMERIC_FIELDS) {
		row[field] = (latest[field] ?? "").toString();
	}
	return row;
}

function useTableSort(defaultKey: string | null = "team_number"): {
	sortKey: string | null;
	sortDirection: "asc" | "desc";
	handleSort: (columnKey: string) => void;
} {
	const [sortKey, setSortKey] = useState<string | null>(defaultKey);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

	function handleSort(columnKey: string): void {
		if (sortKey === columnKey) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
			return;
		}
		setSortKey(columnKey);
		setSortDirection("asc");
	}

	return { sortKey, sortDirection, handleSort };
}

async function fetchPickRanks(
	eventKey: string,
	field: "first_pick_ranking" | "second_pick_ranking",
): Promise<PickRank> {
	if (!Constants.SERVER_ADDRESS) {
		return {};
	}
	const response = await fetch(Constants.SERVER_ADDRESS + eventKey + "/picklist/all");
	const rows = (await response.json()) as PicklistRankingEntry[] | null;
	const ranks: PickRank = {};
	for (const row of rows ?? []) {
		ranks[String(row.team_number)] = Number(row[field]) || 0;
	}
	return ranks;
}

async function updateFirstPick(eventKey: string, teamNumber: number, value: number): Promise<void> {
	if (!Constants.SERVER_ADDRESS) {
		return;
	}
	await fetch(Constants.SERVER_ADDRESS + "picklist/ranking/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			event_key: eventKey,
			team_number: teamNumber,
			first_pick_ranking: value,
		}),
	});
}

async function updateSecondPick(eventKey: string, teamNumber: number, value: number): Promise<void> {
	if (!Constants.SERVER_ADDRESS) {
		return;
	}
	await fetch(Constants.SERVER_ADDRESS + "picklist/ranking/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			event_key: eventKey,
			team_number: teamNumber,
			second_pick_ranking: value,
		}),
	});
}

async function loadBaseTeamRows(eventKey: TbaApi.EventKey): Promise<picklistRow[] | null> {
	if (!Constants.SERVER_ADDRESS) {
		console.error("Could not get fetch link. Check .env");
		return null;
	}

	const matchFetchBase = Constants.SERVER_ADDRESS + eventKey + "/match/team/";
	const pitFetchBase = Constants.SERVER_ADDRESS + eventKey + "/pit/team/data/";
	const [teams, rankings] = await Promise.all([getAllTeams(eventKey), getEventRankings(eventKey)]);
	if (!teams) {
		window.alert("Could not get data");
		return null;
	}

	const table = await mapInBatches(teams, 8, async (team) => {
		const [matchResponse, pitResponse] = await Promise.all([
			fetch(matchFetchBase + team.toString()),
			fetch(pitFetchBase + team.toString()),
		]);
		const matches = (await matchResponse.json()) as Database.MatchEntry[];
		const pitEntries = (await pitResponse.json()) as Database.PitDataEntry[];
		const row: picklistRow = {
			id: team,
			team_number: team,
			tba_ranking: rankings?.[team]?.toString() ?? "",
			...(matches.length ? averageMatchFields(matches, team) : {}),
			...pitQualitativeFields(pitEntries),
		};
		if (!matches.length) {
			for (const field of [
				...NUMERIC_MATCH_FIELDS,
				...BOOLEAN_MATCH_FIELDS,
				"teleop_fuel_hoarded_amount",
			] as const) {
				row[field] ??= "";
			}
		}
		return row;
	});

	table.sort((a, b) => Number(a.team_number) - Number(b.team_number));
	return table;
}

type SharedPicklistData = {
	loading: boolean;
	baseRows: picklistRow[] | null;
	eventKey: TbaApi.EventKey;
};

const PicklistDataContext = createContext<SharedPicklistData | null>(null);

function usePicklistData(): SharedPicklistData {
	const ctx = useContext(PicklistDataContext);
	if (!ctx) {
		throw new Error("usePicklistData must be used within Picklist");
	}
	return ctx;
}

function FirstPick(): React.ReactElement {
	const { loading: sharedLoading, baseRows, eventKey } = usePicklistData();
	const [pickRanks, setPickRanks] = useState<PickRank>({});
	const [pickWeights, setPickWeights] = useState<PicklistWeightsRow | null>(null);
	const [loadingExtras, setLoadingExtras] = useState(true);
	const { sortKey, sortDirection, handleSort } = useTableSort("team_number");

	useEffect(() => {
		void (async function () {
			setLoadingExtras(true);
			try {
				const [savedPickRanks, weights] = await Promise.all([
					fetchPickRanks(eventKey, "first_pick_ranking"),
					fetchPickWeights(eventKey),
				]);
				setPickRanks(savedPickRanks);
				setPickWeights(weights.first);
			} catch (err) {
				console.error("Error occured when getting picklist extras: ", err);
			} finally {
				setLoadingExtras(false);
			}
		})();
	}, [eventKey]);

	const loading = sharedLoading || loadingExtras;
	const tableData =
		baseRows && pickWeights
			? baseRows.map((row) => ({
					...row,
					overall_weight: computeOverallWeight(row, pickWeights),
				}))
			: null;

	const dataWithPickInputs = tableData?.map((row) => {
		const team = String(row.team_number);
		const current = pickRanks?.[team];
		return {
			...row,
			pick_ranking: (
				<NumberInput<Record<string, number>>
					title=""
					name={`first_pick_ranking_${team}`}
					required={false}
					buttons={false}
					min={0}
					max={999}
					value={typeof current === "number" ? current : 0}
					onChange={(val) => {
						setPickRanks({
							...(pickRanks ?? {}),
							[team]: val,
						});
						void updateFirstPick(eventKey, Number(team), val);
					}}
				/>
			),
		};
	});

	return (
		<match-data>
			{loading && <h2>Loading...</h2>}

			{dataWithPickInputs ? (
				<Table
					data={dataWithPickInputs}
					columns={FIRST_PICK_COLUMNS}
					getKey={(row) => (row.id as unknown as number).toString()}
					sortKey={sortKey}
					sortDirection={sortDirection}
					onSort={handleSort}
					rankingSortKeys={["tba_ranking", "pick_ranking"]}
				/>
			) : (
				!loading && <h1>No Data QAQ</h1>
			)}
		</match-data>
	);
}

function SecondPick(): React.ReactElement {
	const { loading: sharedLoading, baseRows, eventKey } = usePicklistData();
	const [pickRanks, setPickRanks] = useState<PickRank>({});
	const [pickWeights, setPickWeights] = useState<PicklistWeightsRow | null>(null);
	const [loadingExtras, setLoadingExtras] = useState(true);
	const { sortKey, sortDirection, handleSort } = useTableSort("team_number");

	useEffect(() => {
		void (async function () {
			setLoadingExtras(true);
			try {
				const [savedPickRanks, weights] = await Promise.all([
					fetchPickRanks(eventKey, "second_pick_ranking"),
					fetchPickWeights(eventKey),
				]);
				setPickRanks(savedPickRanks);
				setPickWeights(weights.second);
			} catch (err) {
				console.error("Error occured when getting picklist extras: ", err);
			} finally {
				setLoadingExtras(false);
			}
		})();
	}, [eventKey]);

	const loading = sharedLoading || loadingExtras;
	const tableData =
		baseRows && pickWeights
			? baseRows.map((row) => ({
					...row,
					overall_weight: computeOverallWeight(row, pickWeights),
				}))
			: null;

	const dataWithPickInputs = tableData?.map((row) => {
		const team = String(row.team_number);
		const current = pickRanks?.[team];
		return {
			...row,
			pick_ranking: (
				<NumberInput<Record<string, number>>
					title=""
					name={`second_pick_ranking_${team}`}
					required={false}
					buttons={false}
					min={0}
					max={999}
					value={typeof current === "number" ? current : 0}
					onChange={(val) => {
						setPickRanks({
							...(pickRanks ?? {}),
							[team]: val,
						});
						void updateSecondPick(eventKey, Number(team), val);
					}}
				/>
			),
		};
	});

	return (
		<match-data>
			{loading && <h2>Loading...</h2>}

			{dataWithPickInputs ? (
				<Table
					data={dataWithPickInputs}
					columns={SECOND_PICK_COLUMNS}
					getKey={(row) => (row.id as unknown as number).toString()}
					sortKey={sortKey}
					sortDirection={sortDirection}
					onSort={handleSort}
					rankingSortKeys={["tba_ranking", "pick_ranking"]}
				/>
			) : (
				!loading && <h1>No Data QAQ</h1>
			)}
		</match-data>
	);
}

function DataDump(): React.ReactElement {
	const { loading, baseRows } = usePicklistData();
	const { sortKey, sortDirection, handleSort } = useTableSort("team_number");

	const tableData = baseRows?.filter((row) => {
		const hasMatch =
			row.auton_fuel_scored !== "" && row.auton_fuel_scored !== undefined;
		const hasPit = Boolean(row.drive_train_type);
		return hasMatch || hasPit;
	});

	return (
		<>
			<match-data>
				{loading && <h2>Loading...</h2>}

				{tableData && tableData.length ? (
					<Table
						data={tableData}
						columns={DATA_DUMP_COLUMNS}
						getKey={(row) => (row.id as unknown as number).toString()}
						sortKey={sortKey}
						sortDirection={sortDirection}
						onSort={handleSort}
					/>
				) : (
					!loading && <h1>No Data QAQ</h1>
				)}
			</match-data>
		</>
	);
}

function Comments(): React.ReactElement {
	const { loading: loadingTeams, baseRows, eventKey } = usePicklistData();
	const [loadingComments, setLoadingComments] = useState(false);
	const [teamNumber, setTeamNumber] = useState(0);
	const { sortKey, sortDirection, handleSort } = useTableSort("comment_type");
	const [commentRows, setCommentRows] = useState<CommentRow[] | null>(null);

	const teamColumns = (() => {
		if (!baseRows?.length) {
			return null;
		}
		const ascending = baseRows.map((row) => Number(row.team_number));
		const columnLength = Math.ceil(ascending.length / 3);
		return [
			ascending.slice(0, columnLength),
			ascending.slice(columnLength, columnLength * 2),
			ascending.slice(columnLength * 2),
		];
	})();

	useEffect(() => {
		async function fetchComments(team: number): Promise<void> {
			if (!team) {
				return;
			}
			if (!Constants.SERVER_ADDRESS) {
				console.error("Could not get fetch link. Check .env");
				return;
			}

			setLoadingComments(true);
			try {
				const base = Constants.SERVER_ADDRESS + eventKey;
				const [matchResponse, stratResponse, pitResponse] = await Promise.all([
					fetch(base + "/match/team/" + team.toString()),
					fetch(base + "/strategic/team/" + team.toString()),
					fetch(base + "/pit/team/data/" + team.toString()),
				]);

				const matchData = (await matchResponse.json()) as Database.MatchEntry[];
				const stratData = (await stratResponse.json()) as Database.StrategicEntry[];
				const pitData = (await pitResponse.json()) as Database.PitDataEntry[];

				const rows: CommentRow[] = [];

				for (const match of matchData) {
					const text = (match.overall_comments || "").trim();
					if (!text) {
						continue;
					}
					rows.push({
						id: `match-${match.id}`,
						comment_type: "Match",
						match_number: match.match_number.toString(),
						scouter_initials: match.scouter_initials,
						comments: text.replaceAll("\\n", "\n"),
					});
				}

				for (const strat of stratData) {
					const text = (strat.comments || "").trim();
					if (!text) {
						continue;
					}
					rows.push({
						id: `strategic-${strat.id}`,
						comment_type: "Strategic",
						match_number: strat.match_number.toString(),
						scouter_initials: strat.scouter_initials,
						comments: text.replaceAll("\\n", "\n"),
					});
				}

				for (const pit of pitData) {
					const text = (pit.comments || "").trim();
					if (!text) {
						continue;
					}
					rows.push({
						id: `pit-${pit.id}`,
						comment_type: "Pit",
						match_number: "",
						scouter_initials: pit.scouter_initials,
						comments: text.replaceAll("\\n", "\n"),
					});
				}

				setCommentRows(rows.length ? rows : null);
			} catch (err) {
				console.error("Error occured when getting data: ", err);
				setCommentRows(null);
			} finally {
				setLoadingComments(false);
			}
		}

		void fetchComments(teamNumber);
	}, [eventKey, teamNumber]);

	const tableData =
		commentRows?.map((row) => ({
			id: row.id,
			comment_type: row.comment_type,
			match_number: row.match_number,
			scouter_initials: row.scouter_initials,
			comments: <p className="commentBox">{row.comments}</p>,
		})) ?? null;

	return (
		<>
			{loadingTeams && <h2>Loading teams...</h2>}
			{!loadingTeams && teamColumns && (
				<>
					<h2>List of Teams</h2>
					<div className="teamColumns">
						{teamColumns.map((column, columnIndex) => (
							<div key={columnIndex} className="teamColumn">
								{column.map((team) => (
									<h2 key={team}>
										<a
											onClick={() => {
												setTeamNumber(team);
											}}
											style={{ cursor: "pointer" }}
										>
											{team}
										</a>
									</h2>
								))}
							</div>
						))}
					</div>
				</>
			)}

			{teamNumber > 0 && (
				<>
					<h2>Comments for {teamNumber}</h2>
					{loadingComments && <h2>Loading...</h2>}
					{!loadingComments && tableData ? (
						<Table
							data={tableData}
							columns={COMMENT_COLUMNS}
							getKey={(row) => String(row.id ?? "")}
							sortKey={sortKey}
							sortDirection={sortDirection}
							onSort={handleSort}
						/>
					) : (
						!loadingComments && <h1>No Comments</h1>
					)}
				</>
			)}
		</>
	);
}

function Weights(): React.ReactElement {
	const [loading, setLoading] = useState(true);
	const [firstWeights, setFirstWeights] = useState<PicklistWeightsRow | null>(null);
	const [secondWeights, setSecondWeights] = useState<PicklistWeightsRow | null>(null);
	const [_eventKey] = useLocalStorage<TbaApi.EventKey>("eventKey", Constants.EVENT_KEY);

	if (!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;

	useEffect(() => {
		void (async function () {
			setLoading(true);
			try {
				const weights = await fetchPickWeights(eventKey);
				setFirstWeights(weights.first);
				setSecondWeights(weights.second);
			} catch (err) {
				console.error("Error fetching picklist weights: ", err);
			} finally {
				setLoading(false);
			}
		})();
	}, [eventKey]);

	function updateWeight(
		which: "first" | "second",
		field: (typeof WEIGHT_FIELDS)[number],
		value: number,
	): void {
		const current = which === "first" ? firstWeights : secondWeights;
		if (!current) {
			return;
		}
		const next = { ...current, [field]: value };
		if (which === "first") {
			setFirstWeights(next);
		} else {
			setSecondWeights(next);
		}
		void savePickWeights(next);
	}

	function weightInputs(row: PicklistWeightsRow, which: "first" | "second"): picklistRow {
		const cells: picklistRow = {
			id: which,
			pick_label: which === "first" ? "First Pick" : "Second Pick",
		};
		for (const field of WEIGHT_FIELDS) {
			cells[field] = (
				<NumberInput<Record<string, number>>
					title=""
					name={`${which}_${field}`}
					required={false}
					buttons={false}
					min={-999}
					max={999}
					value={Number(row[field]) || 0}
					onChange={(val) => {
						updateWeight(which, field, val);
					}}
				/>
			);
		}
		return cells;
	}

	const tableData =
		firstWeights && secondWeights
			? [weightInputs(firstWeights, "first"), weightInputs(secondWeights, "second")]
			: null;

	return (
		<>
			{loading && <h2>Loading weights...</h2>}
			{tableData ? (
				<Table
					data={tableData}
					columns={WEIGHT_COLUMNS}
					getKey={(row) => String(row.id ?? "")}
				/>
			) : (
				!loading && <h1>No Weights</h1>
			)}
		</>
	);
}

function Picklist(): React.ReactElement {
	const [tabNumber, setTabNumber] = useState("1");
	const [loading, setLoading] = useState(true);
	const [baseRows, setBaseRows] = useState<picklistRow[] | null>(null);
	const [_eventKey] = useLocalStorage<TbaApi.EventKey>("eventKey", Constants.EVENT_KEY);

	if (!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;

	useEffect(() => {
		void (async function () {
			setLoading(true);
			try {
				const rows = await loadBaseTeamRows(eventKey);
				setBaseRows(rows);
			} catch (err) {
				console.error("Error occured when getting shared picklist data: ", err);
				setBaseRows(null);
			} finally {
				setLoading(false);
			}
		})();
	}, [eventKey]);

	const shared: SharedPicklistData = { loading, baseRows, eventKey };

	const tabItems: TabItems = [
		{
			key: "1",
			label: "First Pick",
			children: <FirstPick />,
		},
		{
			key: "2",
			label: "Second Pick",
			children: <SecondPick />,
		},
		{
			key: "3",
			label: "Data Dump",
			children: <DataDump />,
		},
		{
			key: "4",
			label: "Comments",
			children: <Comments />,
		},
		{
			key: "5",
			label: "Weights",
			children: <Weights />,
		},
	];

	return (
		<>
			<Header name={"Picklist"} back={"#"} />
			<picklist>
				<PicklistDataContext.Provider value={shared}>
					<Tabs defaultActiveKey="1" activeKey={tabNumber} items={tabItems} onChange={setTabNumber} />
				</PicklistDataContext.Provider>
			</picklist>
		</>
	);
}

export default Picklist;
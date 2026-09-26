import "../public/stylesheets/dataLookup.css";
import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use";
import Header from "../parts/header";
import { getAllTeams } from "../utils/tbaRequest.ts";
import Constants from "../utils/constants";

import type * as TbaApi from "../types/tbaApi";
import type * as Database from "../types/database";

type Props = {
	title: string;
};

type DataView = "match" | "comments" | "pit";
type Kind = "match" | "strategic" | "pit";

type Slice<T> = {
	status: "loading" | "ready" | "error";
	rows: T[];
	message: string;
};

type TeamCache = {
	match?: Slice<Database.MatchEntry>;
	strategic?: Slice<Database.StrategicEntry>;
	pit?: Slice<Database.PitDataEntry>;
};

type CommentRow = {
	id: string;
	qual: string;
	category: "Match" | "Pit" | "Strategic";
	text: string;
	levelRank: number;
	matchNumber: number;
};

type FetchResult<T> = { ok: true; rows: T[] } | { ok: false; message: string };

const VIEWS: { id: DataView; label: string }[] = [
	{ id: "match", label: "Match" },
	{ id: "comments", label: "Comments" },
	{ id: "pit", label: "Pit" },
];

const COMP_LEVEL_ORDER: TbaApi.Comp_Level[] = ["qm", "ef", "qf", "sf", "f"];

const COMP_LEVEL_LABEL: Record<TbaApi.Comp_Level, string> = {
	qm: "Qual",
	ef: "EF",
	qf: "QF",
	sf: "SF",
	f: "Final",
};

const REQUEST_FAILED = "Could not load this team. Is the server running?";
const SERVER_MISSING = "Server address is not set. Check the client .env.";

const MATCH_ROWS: { label: string; colored: boolean; value: (entry: Database.MatchEntry) => string }[] = [
	{ label: "Auto Climb", colored: true, value: autoClimbLabel },
	{ label: "Auto Fuel", colored: false, value: (entry) => numberText(entry.auton_fuel_scored) },
	{ label: "Teleop Fuel", colored: false, value: (entry) => numberText(entry.teleop_fuel_scored) },
	{ label: "Hoard", colored: false, value: (entry) => textOrNa(entry.teleop_fuel_hoarded_amount) },
	{ label: "Hoard Type", colored: false, value: (entry) => textOrNa(entry.teleop_primary_hoard_type) },
	{ label: "Teleop Climb", colored: true, value: teleopClimbLabel },
	{ label: "Robot Died", colored: false, value: (entry) => flag(entry.overall_robot_died) },
	{ label: "Robot Got Defended?", colored: false, value: (entry) => flag(entry.overall_was_defended) },
	{ label: "Robot Played Defense", colored: false, value: (entry) => flag(entry.overall_defended_others) },
	{ label: "Shot While Moving", colored: false, value: (entry) => flag(entry.overall_shot_while_moving) },
];

const PIT_FIELDS: { label: string; value: (row: Database.PitDataEntry) => string }[] = [
	{ label: "Drive Train", value: (row) => textOrNa(row.drive_train_type) },
	{ label: "Driving Motor", value: (row) => textOrNa(row.driving_motor_type) },
	{ label: "# of Drive Motors", value: (row) => numberText(row.number_of_driving_motors) },
	{ label: "Wheel Type", value: (row) => textOrNa(row.wheel_type) },
	{ label: "Intake Type", value: (row) => textOrNa(row.intake_type) },
	{ label: "Intake Location", value: (row) => textOrNa(row.fuel_intake_location) },
	{ label: "Intake Width", value: (row) => textOrNa(row.intake_width) },
	{ label: "Trench Capable", value: (row) => flag(row.trench_capability) },
	{ label: "Shot Range", value: (row) => textOrNa(row.max_shot_range) },
	{ label: "Fuel Capacity", value: (row) => numberText(row.max_fuel_capacity) },
	{ label: "Climb", value: pitClimb },
	{ label: "Climb in Auto", value: (row) => flag(row.climb_during_auto) },
	{ label: "Robot Weight", value: (row) => numberText(row.robot_weight) },
	{ label: "Pit Organization", value: (row) => numberText(row.pit_organization) },
	{ label: "Team Safety", value: (row) => numberText(row.team_safety) },
	{ label: "Workmanship", value: (row) => numberText(row.team_workmanship) },
	{ label: "Gracious Professionalism", value: (row) => numberText(row.gracious_professionalism) },
	{ label: "Electrical Issues", value: (row) => textOrNa(row.any_electrical_issues) },
];

function textOrNa(value: unknown): string {
	if (typeof value !== "string") {
		return "NA";
	}
	if (value.trim() === "") {
		return "NA";
	}
	return value;
}

function numberText(value: unknown): string {
	if (typeof value === "number") {
		return String(value);
	}
	return "NA";
}

function flag(value: unknown): string {
	if (value === 1 || value === true) {
		return "Yes";
	}
	if (value === 0 || value === false) {
		return "No";
	}
	return "NA";
}

function shortClimb(level: string): string {
	switch (level) {
		case "Level 1":
		case "L1":
			return "L1";
		case "Level 2":
		case "L2":
			return "L2";
		case "Level 3":
		case "L3":
			return "L3";
		default:
			return textOrNa(level);
	}
}

function autoClimbLabel(entry: Database.MatchEntry): string {
	if (entry.auton_climb_attempted === 0) {
		return "NA";
	}
	if (entry.auton_climb_successful === 1) {
		return "Yes";
	}
	return "No";
}

function teleopClimbLabel(entry: Database.MatchEntry): string {
	if (entry.endgame_climb_attempted === 0) {
		return "NA";
	}
	if (entry.endgame_climb_successful === 1) {
		return shortClimb(entry.endgame_climb_level);
	}
	return "No";
}

function pitClimb(row: Database.PitDataEntry): string {
	const levels = [
		row.can_climb_l1 === 1 ? "L1" : "",
		row.can_climb_l2 === 1 ? "L2" : "",
		row.can_climb_l3 === 1 ? "L3" : "",
	].filter((level) => level !== "");

	if (levels.length === 0) {
		return "NA";
	}
	return levels.join(", ");
}

function toneClass(value: string): string {
	switch (value) {
		case "L1":
		case "No":
			return "tone-l1";
		case "L2":
		case "Yes":
			return "tone-l2";
		case "L3":
			return "tone-l3";
		case "NA":
			return "tone-na";
		default:
			return "";
	}
}

function kindsFor(view: DataView): Kind[] {
	switch (view) {
		case "match":
			return ["match"];
		case "pit":
			return ["pit"];
		case "comments":
			return ["match", "strategic", "pit"];
		default:
			throw new Error(`Unknown view ${view}`);
	}
}

function sliceOf(cache: TeamCache | undefined, kind: Kind): Slice<unknown> | undefined {
	if (!cache) {
		return undefined;
	}
	switch (kind) {
		case "match":
			return cache.match;
		case "strategic":
			return cache.strategic;
		case "pit":
			return cache.pit;
		default:
			throw new Error(`Unknown kind ${kind}`);
	}
}

function viewStatus(cache: TeamCache | undefined, view: DataView): "loading" | "error" | "ready" {
	const kinds = kindsFor(view);
	let sawError = false;

	for (const kind of kinds) {
		const slice = sliceOf(cache, kind);
		if (!slice || slice.status === "loading") {
			return "loading";
		}
		if (slice.status === "error") {
			sawError = true;
		}
	}

	if (sawError) {
		return "error";
	}
	return "ready";
}

function errorMessage(cache: TeamCache | undefined, view: DataView): string {
	for (const kind of kindsFor(view)) {
		const slice = sliceOf(cache, kind);
		if (slice?.status === "error") {
			return slice.message;
		}
	}
	return REQUEST_FAILED;
}

function teamPath(kind: Kind, team: number): string {
	switch (kind) {
		case "match":
			return `/match/team/${team}`;
		case "strategic":
			return `/strategic/team/${team}`;
		case "pit":
			return `/pit/team/data/${team}`;
		default:
			throw new Error(`Unknown kind ${kind}`);
	}
}

async function fetchRows<T>(url: string): Promise<FetchResult<T>> {
	if (!Constants.SERVER_ADDRESS) {
		return { ok: false, message: SERVER_MISSING };
	}

	try {
		const response = await fetch(url);
		if (!response.ok) {
			return { ok: false, message: REQUEST_FAILED };
		}

		const data: unknown = await response.json();
		if (!Array.isArray(data)) {
			return { ok: false, message: "The server returned an unexpected response." };
		}

		return { ok: true, rows: data as T[] };
	} catch {
		return { ok: false, message: REQUEST_FAILED };
	}
}

function matchHeading(entry: Database.MatchEntry): string {
	return `${COMP_LEVEL_LABEL[entry.comp_level]} ${entry.match_number}`;
}

function sortedMatches(entries: Database.MatchEntry[]): Database.MatchEntry[] {
	return entries
		.map((entry, index) => ({ entry, index }))
		.sort((a, b) => {
			const levelDiff =
				COMP_LEVEL_ORDER.indexOf(a.entry.comp_level) - COMP_LEVEL_ORDER.indexOf(b.entry.comp_level);
			if (levelDiff !== 0) {
				return levelDiff;
			}
			const matchDiff = a.entry.match_number - b.entry.match_number;
			if (matchDiff !== 0) {
				return matchDiff;
			}
			return a.index - b.index;
		})
		.map((item) => item.entry);
}

function columnHeadings(entries: Database.MatchEntry[]): string[] {
	const totals = new Map<string, number>();

	for (const entry of entries) {
		const heading = matchHeading(entry);
		totals.set(heading, (totals.get(heading) ?? 0) + 1);
	}

	return entries.map((entry) => {
		const heading = matchHeading(entry);
		const count = totals.get(heading) ?? 0;
		if (count > 1) {
			return `${heading} (${entry.scouter_initials})`;
		}
		return heading;
	});
}

function cleanComment(value: unknown): string {
	if (typeof value !== "string") {
		return "";
	}
	return value.replaceAll("\\n", "\n").trim();
}

function qualLabel(level: TbaApi.Comp_Level, matchNumber: number): string {
	if (level === "qm") {
		return `#${matchNumber}`;
	}
	return `${COMP_LEVEL_LABEL[level]} ${matchNumber}`;
}

function buildComments(
	matches: Database.MatchEntry[],
	strategic: Database.StrategicEntry[],
	pit: Database.PitDataEntry[],
): CommentRow[] {
	const rows: CommentRow[] = [];

	for (const entry of matches) {
		const text = cleanComment(entry.overall_comments);
		if (text === "") {
			continue;
		}
		rows.push({
			id: `match-${entry.id}`,
			qual: qualLabel(entry.comp_level, entry.match_number),
			category: "Match",
			text,
			levelRank: COMP_LEVEL_ORDER.indexOf(entry.comp_level),
			matchNumber: entry.match_number,
		});
	}

	for (const entry of strategic) {
		const text = cleanComment(entry.comments);
		if (text === "") {
			continue;
		}
		rows.push({
			id: `strategic-${entry.id}`,
			qual: qualLabel(entry.comp_level, entry.match_number),
			category: "Strategic",
			text,
			levelRank: COMP_LEVEL_ORDER.indexOf(entry.comp_level),
			matchNumber: entry.match_number,
		});
	}

	for (const entry of pit) {
		const text = cleanComment(entry.comments);
		if (text === "") {
			continue;
		}
		rows.push({
			id: `pit-${entry.id}`,
			qual: "—",
			category: "Pit",
			text,
			levelRank: -1,
			matchNumber: 0,
		});
	}

	rows.sort((a, b) => {
		if (a.levelRank !== b.levelRank) {
			return b.levelRank - a.levelRank;
		}
		return b.matchNumber - a.matchNumber;
	});

	return rows;
}

function CellText(props: { value: string; colored: boolean }): React.ReactElement {
	if (!props.colored) {
		return <>{props.value}</>;
	}
	return <span className={toneClass(props.value)}>{props.value}</span>;
}

function MatchTable(props: { rows: Database.MatchEntry[] }): React.ReactElement {
	const entries = sortedMatches(props.rows);
	const headings = columnHeadings(entries);

	if (entries.length === 0) {
		return <p className="status-line">No match data for this team.</p>;
	}

	return (
		<div className="table-scroll">
			<table className="lookup-table match-table">
				<thead>
					<tr>
						<th className="row-label">Qual #</th>
						{headings.map((heading, index) => (
							<th key={`${heading}-${index}`}>{heading}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{MATCH_ROWS.map((row) => (
						<tr key={row.label}>
							<th className="row-label" scope="row">
								{row.label}
							</th>
							{entries.map((entry) => (
								<td key={`${row.label}-${entry.id}`}>
									<CellText value={row.value(entry)} colored={row.colored} />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CommentsTable(props: {
	matches: Database.MatchEntry[];
	strategic: Database.StrategicEntry[];
	pit: Database.PitDataEntry[];
}): React.ReactElement {
	const rows = buildComments(props.matches, props.strategic, props.pit);

	if (rows.length === 0) {
		return <p className="status-line">No comments for this team.</p>;
	}

	return (
		<div className="table-scroll">
			<table className="lookup-table comments-table">
				<thead>
					<tr>
						<th>Qual #</th>
						<th>Category</th>
						<th>Comments</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.id}>
							<td>{row.qual}</td>
							<td>{row.category}</td>
							<td className="comment-text">{row.text}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function PitSpecs(props: { rows: Database.PitDataEntry[] }): React.ReactElement {
	if (props.rows.length === 0) {
		return <p className="status-line">No pit data for this team.</p>;
	}

	return (
		<>
			{props.rows.map((row, index) => (
				<div className="pit-block" key={row.id}>
					{props.rows.length > 1 ? (
						<p className="scout-label">
							Scout {index + 1}: {row.scouter_initials}
						</p>
					) : null}
					<dl className="spec-list">
						{PIT_FIELDS.map((field) => (
							<div className="spec-row" key={field.label}>
								<dt>{field.label}</dt>
								<dd>{field.value(row)}</dd>
							</div>
						))}
					</dl>
				</div>
			))}
		</>
	);
}

function TeamBody(props: { view: DataView; cache: TeamCache | undefined; onRetry: () => void }): React.ReactElement {
	const status = viewStatus(props.cache, props.view);

	if (status === "loading") {
		return <p className="status-line">Loading...</p>;
	}

	const matches = props.cache?.match?.status === "ready" ? props.cache.match.rows : [];
	const strategic = props.cache?.strategic?.status === "ready" ? props.cache.strategic.rows : [];
	const pit = props.cache?.pit?.status === "ready" ? props.cache.pit.rows : [];

	if (status === "error") {
		return (
			<p className="status-line">
				{errorMessage(props.cache, props.view)}
				<button type="button" className="retry" onClick={props.onRetry}>
					Retry
				</button>
			</p>
		);
	}

	switch (props.view) {
		case "match":
			return <MatchTable rows={matches} />;
		case "comments":
			return <CommentsTable matches={matches} strategic={strategic} pit={pit} />;
		case "pit":
			return <PitSpecs rows={pit} />;
		default:
			throw new Error(`Unknown view ${props.view}`);
	}
}

type TeamCardProps = {
	team: number;
	open: boolean;
	view: DataView;
	cache: TeamCache | undefined;
	onOpen: () => void;
	onClose: () => void;
	onRetry: () => void;
};

function TeamCard(props: TeamCardProps): React.ReactElement {
	return (
		<article className="team-card">
			<div className="team-head">
				<h2 className="team-number">{props.team}</h2>
				<div className="team-actions">
					<button
						type="button"
						className="icon-button"
						aria-label={`Collapse ${props.team}`}
						onClick={props.onClose}
					>
						−
					</button>
					<button type="button" className="icon-button" aria-label={`Expand ${props.team}`} onClick={props.onOpen}>
						+
					</button>
				</div>
			</div>
			{props.open ? (
				<div className="team-body">
					<TeamBody view={props.view} cache={props.cache} onRetry={props.onRetry} />
				</div>
			) : null}
		</article>
	);
}

function SearchIcon(): React.ReactElement {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
			<path d="M16 16 L20.5 20.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

function DataLookup(props: Props): React.ReactElement {
	const [view, setView] = useState<DataView>("match");
	const [query, setQuery] = useState("");
	const [teams, setTeams] = useState<number[] | null>(null);
	const [teamsStatus, setTeamsStatus] = useState<"loading" | "ready" | "error">("loading");
	const [teamListAttempt, setTeamListAttempt] = useState(0);
	const [openTeam, setOpenTeam] = useState<number | null>(null);
	const [cache, setCache] = useState<Record<number, TeamCache>>({});
	const [retryToken, setRetryToken] = useState(0);
	const [_eventKey] = useLocalStorage<TbaApi.EventKey>("eventKey", Constants.EVENT_KEY);

	const cacheRef = useRef(cache);
	cacheRef.current = cache;
	const requestIds = useRef(new Map<string, number>());

	const eventKey = _eventKey ?? "";

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);

	useEffect(() => {
		if (eventKey === "") {
			return;
		}

		let cancelled = false;
		setTeamsStatus("loading");

		void getAllTeams(eventKey).then((numbers) => {
			if (cancelled) {
				return;
			}
			if (!numbers) {
				setTeams(null);
				setTeamsStatus("error");
				return;
			}
			setTeams(numbers);
			setTeamsStatus("ready");
		});

		return () => {
			cancelled = true;
		};
	}, [eventKey, teamListAttempt]);

	useEffect(() => {
		if (openTeam === null || eventKey === "") {
			return;
		}

		const team = openTeam;

		type AnyRow = Database.MatchEntry & Database.StrategicEntry & Database.PitDataEntry;

		function storeSlice(kind: Kind, slice: Slice<AnyRow>): void {
			setCache((prev) => {
				const current = prev[team] ?? {};
				if (kind === "match") {
					return { ...prev, [team]: { ...current, match: slice } };
				}
				if (kind === "strategic") {
					return { ...prev, [team]: { ...current, strategic: slice } };
				}
				return { ...prev, [team]: { ...current, pit: slice } };
			});
		}

		for (const kind of kindsFor(view)) {
			const existing = sliceOf(cacheRef.current[team], kind);
			if (existing && existing.status !== "loading") {
				continue;
			}
			if (existing?.status === "loading") {
				continue;
			}

			const key = `${team}:${kind}`;
			const requestId = (requestIds.current.get(key) ?? 0) + 1;
			requestIds.current.set(key, requestId);
			storeSlice(kind, { status: "loading", rows: [], message: "" });

			const url = `${Constants.SERVER_ADDRESS ?? ""}${eventKey}${teamPath(kind, team)}`;
			void fetchRows<Database.MatchEntry & Database.StrategicEntry & Database.PitDataEntry>(url).then((result) => {
				if (requestIds.current.get(key) !== requestId) {
					return;
				}
				if (result.ok) {
					storeSlice(kind, { status: "ready", rows: result.rows, message: "" });
					return;
				}
				storeSlice(kind, { status: "error", rows: [], message: result.message });
			});
		}
	}, [openTeam, view, eventKey, retryToken]);

	function retryTeam(team: number): void {
		setCache((prev) => {
			const current = { ...(prev[team] ?? {}) };
			for (const kind of kindsFor(view)) {
				const key = `${team}:${kind}`;
				requestIds.current.set(key, (requestIds.current.get(key) ?? 0) + 1);
				if (kind === "match") {
					current.match = undefined;
				} else if (kind === "strategic") {
					current.strategic = undefined;
				} else {
					current.pit = undefined;
				}
			}
			return { ...prev, [team]: current };
		});
		setRetryToken((token) => token + 1);
	}

	const filtered = (teams ?? []).filter((team) => String(team).includes(query.trim()));

	let list: React.ReactElement;
	if (eventKey === "") {
		list = <p className="status-line">Set an event key in Settings before looking up teams.</p>;
	} else if (teamsStatus === "loading") {
		list = <p className="status-line">Loading teams...</p>;
	} else if (teamsStatus === "error") {
		list = (
			<p className="status-line">
				Could not load the team list.
				<button type="button" className="retry" onClick={() => { setTeamListAttempt((attempt) => attempt + 1); }}>
					Retry
				</button>
			</p>
		);
	} else if (filtered.length === 0) {
		list = <p className="status-line">No teams match that search.</p>;
	} else {
		list = (
			<div className="team-list">
				{filtered.map((team) => (
					<TeamCard
						key={team}
						team={team}
						open={openTeam === team}
						view={view}
						cache={cache[team]}
						onOpen={() => {
							setOpenTeam(team);
						}}
						onClose={() => {
							setOpenTeam((current) => (current === team ? null : current));
						}}
						onRetry={() => {
							retryTeam(team);
						}}
					/>
				))}
			</div>
		);
	}

	return (
		<>
			<Header name={"Data Lookup"} back={"#scoutingapp"} />

			<data-lookup>
				<p className="section-label">Data Type</p>
				<div className="type-switch" role="tablist" aria-label="Data type">
					{VIEWS.map((item) => (
						<button
							key={item.id}
							type="button"
							role="tab"
							aria-selected={view === item.id}
							onClick={() => {
								setView(item.id);
							}}
						>
							{item.label}
						</button>
					))}
				</div>

				<label className="search">
					<input
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
						}}
						placeholder="Search Teams"
						inputMode="numeric"
						aria-label="Search Teams"
					/>
					<SearchIcon />
				</label>

				{list}
			</data-lookup>
		</>
	);
}

export default DataLookup;

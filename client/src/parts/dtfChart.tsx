import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { splitString } from "../utils/utils";
import "../public/stylesheets/tabs.css";

import type * as Database from "../types/database";
import type { TooltipItem, ChartDataset } from "chart.js/auto";
import { assertNumber } from "../types/assertions";

type Props = {
	teamMatches: Database.MatchEntry[];
	teamStrategic: Database.StrategicEntry[];
};

function DTFAutonChartComponent(props: Props): React.ReactElement {
	const autonFuelScored = useRef<HTMLCanvasElement>(null);

	const teamMatches = props.teamMatches;
	const teamStrategic = props.teamStrategic;

	useEffect(() => {
		if (!autonFuelScored.current) {
			return;
		}
		const matchNumbers = teamMatches.map(function (row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<"line">[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);
			const currentStrategicMatches = teamStrategic.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);

			for (const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for (const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(
			autonFuelScored.current,
			teamMatches,
			matchNumbers,
			{
				Auton: {
					values: {
						Fuel: "auton_fuel_scored",
					},
				},
			},
			commentCallback,
		);
	}, [autonFuelScored.current]);

	return (
		<div className="dtfChart">
			<h2>Auton Fuel Score Graph</h2>
			{<canvas ref={autonFuelScored}></canvas>}
		</div>
	);
}

function DTFTeleopChartComponent(props: Props): React.ReactElement {
	const teleopFuelCanvas = useRef<HTMLCanvasElement>(null);

	const teamMatches = props.teamMatches;
	const teamStrategic = props.teamStrategic;

	useEffect(() => {
		if (!teleopFuelCanvas.current) {
			return;
		}
		const matchNumbers = teamMatches.map(function (row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<"line">[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);
			const currentStrategicMatches = teamStrategic.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);

			for (const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for (const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(
			teleopFuelCanvas.current,
			teamMatches,
			matchNumbers,
			{
				Teleop: {
					values: {
						Fuel: "teleop_fuel_scored",
					},
				},
			},
			commentCallback,
		);
	}, [teleopFuelCanvas.current]);

	return (
		<div className="dtfChart">
			<h2>Teleop Fuel Score Graph</h2>
			{<canvas ref={teleopFuelCanvas}></canvas>}
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const auton_climb_values = new Map<Database.Tinyint, number>([[1, 15]]);

const teleop_climb_values = new Map<string, number>([
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	["Level 1", 10],
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	["Level 2", 10],
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	["Level 3", 10],
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	["Level_1", 10],
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	["Level_2", 10],
	// eslint-disable-next-line @typescript-eslint/no-magic-numbers
	["Level_3", 10],
]);

function climbScore(match: Database.MatchEntry): number {
	const auton = auton_climb_values.get(match.auton_climb_successful) ?? 0;
	const teleop = match.endgame_climb_successful ? (teleop_climb_values.get(match.endgame_climb_level) ?? 0) : 0;
	return auton + teleop;
}

function DTFClimpChartComponent(props: Props): React.ReactElement {
	const climbCanvas = useRef<HTMLCanvasElement>(null);

	const teamMatches = props.teamMatches;
	const teamStrategic = props.teamStrategic;

	useEffect(() => {
		if (!climbCanvas.current) {
			return;
		}
		const matchNumbers = teamMatches.map(function (row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<"line">[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);
			const currentStrategicMatches = teamStrategic.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);

			for (const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for (const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(
			climbCanvas.current,
			teamMatches,
			matchNumbers,
			{
				Climb: {
					values: {
						"Auton Climb": "auton_climb_successful",
						"Teleop Level": "endgame_climb_level",
						"Teleop Climb": "endgame_climb_successful",
					},
					score: climbScore,
				},
			},
			commentCallback,
		);
	}, [climbCanvas.current]);

	return (
		<div className="dtfChart">
			<h2>Climb Score Graph</h2>
			{<canvas ref={climbCanvas}></canvas>}
		</div>
	);
}

function overallScore(match: Database.MatchEntry): number {
	return match.auton_fuel_scored + match.teleop_fuel_scored + climbScore(match);
}

function DTFOverallChartComponent(props: Props): React.ReactElement {
	const overallCanvas = useRef<HTMLCanvasElement>(null);

	const teamMatches = props.teamMatches;
	const teamStrategic = props.teamStrategic;

	useEffect(() => {
		if (!overallCanvas.current) {
			return;
		}
		const matchNumbers = teamMatches.map(function (row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<"line">[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);
			const currentStrategicMatches = teamStrategic.filter(
				(row) => row.match_number === match_number && row.comp_level === comp_level,
			);

			for (const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for (const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(
			overallCanvas.current,
			teamMatches,
			matchNumbers,
			{
				Overall: {
					values: {
						Auton: "auton_fuel_scored",
						Teleop: "teleop_fuel_scored",
						"Auton Climb": "auton_climb_successful",
						"Teleop Level": "endgame_climb_level",
						"Teleop Climb": "endgame_climb_successful",
					},
					score: overallScore,
				},
			},
			commentCallback,
		);
	}, [overallCanvas.current]);

	return (
		<div className="dtfChart">
			<h2>Overall Score Graph</h2>
			{<canvas ref={overallCanvas}></canvas>}
		</div>
	);
}

type ChartConfig = {
	[name: string]: {
		values: {
			[item_name: string]: string;
		};
		calculateAverage?: boolean;
		score?: (row: Database.MatchEntry) => number;
	};
};

// Look in git history for how to make a line graph
function createChart(
	canvas: HTMLCanvasElement,
	teamMatches: Database.MatchEntry[],
	matchNumbers: string[],
	config: ChartConfig,
	tooltipCallback?: (message: string[], items: TooltipItem<"line">[]) => void,
): void {
	const values: ChartDataset<"line">[] = [];
	const averages: ChartDataset<"line">[] = [];
	for (const [dataLine, lineOptions] of Object.entries(config)) {
		const doAverage = lineOptions.calculateAverage;
		let average = 0;
		//put each data in teamMatches as a parameter of function(row)
		//function that returns the height of each "bar" of graph
		const data = teamMatches.map(function (row) {
			let value = 0;
			if (lineOptions.score) {
				value = lineOptions.score(row);
			} else {
				for (const [_, item] of Object.entries(lineOptions.values)) {
					// :eyes:
					const itemValue = row[item as keyof typeof row];
					//assertNumber checks if itemValue is "number" type or not
					assertNumber(itemValue);
					value += itemValue;
				}
			}

			if (doAverage) {
				average += value;
			}

			return value;
		});

		const color = teamMatches.map(function (row) {
			const checker = row.overall_was_defended;
			if (checker) {
				return "rgba(224, 22, 22, 0.5)";
			}
			return "rgba(65, 144, 223, 0.5)";
		});

		values.push({
			label: dataLine,
			data: data,
			backgroundColor: color,
		});

		if (doAverage) {
			if (teamMatches.length > 0) {
				average /= teamMatches.length;
			}
			averages.push({
				label: `Average ${dataLine}`,
				data: Array<number>(teamMatches.length).fill(average),
				pointRadius: 0,
			});
		}
	}

	function tooltip(items: TooltipItem<"line">[]): string {
		const message = [];
		for (const dataPoint of items) {
			const match = teamMatches[dataPoint.dataIndex];

			if (!dataPoint.dataset.label) {
				continue;
			}

			const entry = config[dataPoint.dataset.label].values;

			message.push(`${dataPoint.dataset.label}:`);

			for (const [itemName, dataKey] of Object.entries(entry)) {
				message.push(`${itemName}: ${match[dataKey as keyof typeof match]}`);
			}

			if (tooltipCallback) {
				tooltipCallback(message, items);
			}
		}

		const lineLength = 80;
		const lineSep = "\n";
		const wrappedLines = message.map((l) => splitString(l, lineLength).join(lineSep));

		return wrappedLines.join(lineSep);
	}

	new Chart(canvas, {
		type: "bar",
		data: {
			labels: matchNumbers,
			datasets: [...values, ...averages],
		},

		options: {
			plugins: {
				tooltip: {
					callbacks: {
						footer: tooltip,
					},
				},
			},
		},
	});
}

const CHART_TABS = [
	{ key: "auton", label: "Auton" },
	{ key: "teleop", label: "Teleop" },
	{ key: "climb", label: "Climb" },
	{ key: "overall", label: "Overall" },
] as const;

type ChartTabKey = (typeof CHART_TABS)[number]["key"];

function DTFChartGallery(props: Props): React.ReactElement {
	const [chartKey, setChartKey] = useState<ChartTabKey>("auton");

	let chart: React.ReactElement;
	switch (chartKey) {
		case "teleop":
			chart = <DTFTeleopChartComponent teamMatches={props.teamMatches} teamStrategic={props.teamStrategic} />;
			break;
		case "climb":
			chart = <DTFClimpChartComponent teamMatches={props.teamMatches} teamStrategic={props.teamStrategic} />;
			break;
		case "overall":
			chart = <DTFOverallChartComponent teamMatches={props.teamMatches} teamStrategic={props.teamStrategic} />;
			break;
		default:
			chart = <DTFAutonChartComponent teamMatches={props.teamMatches} teamStrategic={props.teamStrategic} />;
			break;
	}

	return (
		<tabs-container>
			<tabs-nav-container>
				{CHART_TABS.map((tab) => (
					<nav-label
						key={tab.key}
						{...(tab.key === chartKey ? { selected: true } : {})}
						onClick={() => {
							setChartKey(tab.key);
						}}
					>
						{tab.label}
					</nav-label>
				))}
			</tabs-nav-container>
			<tab-page {...{ activetab: true }}>{chart}</tab-page>
		</tabs-container>
	);
}

export {
	DTFAutonChartComponent,
	DTFTeleopChartComponent,
	DTFClimpChartComponent,
	DTFOverallChartComponent,
	DTFChartGallery,
};

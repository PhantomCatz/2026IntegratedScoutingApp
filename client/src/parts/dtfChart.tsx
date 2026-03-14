import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { splitString, } from '../utils/utils';

import type *  as Database from '../types/database';
import type { TooltipItem, ChartDataset } from 'chart.js/auto';
import { assertNumber, } from '../types/assertions';

type Props = {
	teamMatches: Database.MatchEntry[],
	teamStrategic: Database.StrategicEntry[],
};

function DTFChartComponent(props: Props): React.ReactElement {
	const autonAlgaeCanvas = useRef<HTMLCanvasElement>(null);
	const teleopAlgaeCanvas = useRef<HTMLCanvasElement>(null);
	const autonCoralCanvas = useRef<HTMLCanvasElement>(null);
	const teleopCoralCanvas = useRef<HTMLCanvasElement>(null);

	const teamMatches = props.teamMatches;
	const teamStrategic = props.teamStrategic;

	useEffect(() => {
		if(!(autonAlgaeCanvas.current &&
			teleopAlgaeCanvas.current &&
			autonCoralCanvas.current &&
			teleopCoralCanvas.current
		)) {
			return;
		}
		const matchNumbers = teamMatches.map(function(row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<'line'>[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter((row) => row.match_number === match_number && row.comp_level === comp_level);
			const currentStrategicMatches = teamStrategic.filter((row) => row.match_number === match_number && row.comp_level === comp_level);

			for(const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for(const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(autonAlgaeCanvas.current, teamMatches, matchNumbers, {
			"Auton": {
				values: {
					"Auton": "auton_fuel_scored",
				},
				// calculateAverage: true,
			},
			"Teleop": {
				values: {
					"Teleop": "teleop_fuel_scored",
				},
				// calculateAverage: true,
			},
		}, commentCallback);
	}, [autonAlgaeCanvas.current, teleopAlgaeCanvas.current, autonCoralCanvas.current, teleopCoralCanvas.current]);


	return (
		<div className="dtfChart">
			<h2>Auton Algae</h2>
			{<canvas ref={autonAlgaeCanvas}></canvas>}
			<h2>Teleop Algae</h2>
			{<canvas ref={teleopAlgaeCanvas}></canvas>}
			<h2>Auton Coral</h2>
			{<canvas ref={autonCoralCanvas}></canvas>}
			<h2>Teleop Coral</h2>
			{<canvas ref={teleopCoralCanvas}></canvas>}
		</div>
	);
}

function DTFAutonChartComponent(props: Props): React.ReactElement {
	const autonFuelScored = useRef<HTMLCanvasElement>(null);

	const teamMatches = props.teamMatches;
	const teamStrategic = props.teamStrategic;

	useEffect(() => {
		if(!(autonFuelScored.current
		)) {
			return;
		}
		const matchNumbers = teamMatches.map(function(row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<'line'>[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter((row) => row.match_number === match_number && row.comp_level === comp_level);
			const currentStrategicMatches = teamStrategic.filter((row) => row.match_number === match_number && row.comp_level === comp_level);

			for(const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for(const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(autonFuelScored.current, teamMatches, matchNumbers, {
			"Auton": {
				values: {
					"Fuel": "auton_fuel_scored",
				},
			},
		}, commentCallback);

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
		if(!(teleopFuelCanvas.current
		)) {
			return;
		}
		const matchNumbers = teamMatches.map(function(row) {
			const comp_level = row.comp_level;
			const match_number = row.match_number;

			return comp_level[0].toUpperCase() + match_number.toString();
		});

		function commentCallback(message: string[], items: TooltipItem<'line'>[]): void {
			const dataPoint = items[0];
			const match = teamMatches[dataPoint.dataIndex];
			const match_number = match.match_number;
			const comp_level = match.comp_level;

			const currentTeamMatches = teamMatches.filter((row) => row.match_number === match_number && row.comp_level === comp_level);
			const currentStrategicMatches = teamStrategic.filter((row) => row.match_number === match_number && row.comp_level === comp_level);

			for(const match of currentTeamMatches) {
				message.push("MS: " + match.overall_comments);
			}
			for(const match of currentStrategicMatches) {
				message.push("SS: " + match.comments);
			}
		}

		createChart(teleopFuelCanvas.current, teamMatches, matchNumbers, {
			"Teleop": {
				values: {
					"Fuel": "teleop_fuel_scored",
				},
			},
		}, commentCallback);

	}, [teleopFuelCanvas.current]);


	return (
		<div className="dtfChart">
			<h2>Teleop Fuel Score Graph</h2>
			{<canvas ref={teleopFuelCanvas}></canvas>}
		</div>
	);
}



type ChartConfig = {
	[name: string]: {
		values: {
			[item_name: string]: string
		},
		calculateAverage?: boolean,
	}
};

// Look in git history for how to make a line graph
function createChart(canvas: HTMLCanvasElement,
	teamMatches: Database.MatchEntry[],
	matchNumbers: string[],
	config: ChartConfig,
	tooltipCallback?: (message: string[], items: TooltipItem<'line'>[]) => void): void {
	const values: ChartDataset<'line'>[] = [];
	const averages: ChartDataset<'line'>[] = [];
	for(const [dataLine, lineOptions] of Object.entries(config)) {
		const doAverage = lineOptions.calculateAverage;
		let average = 0;
			//put each data in teamMatches as a parameter of function(row)
			//function that returns the height of each "bar" of graph
		const data = teamMatches.map(function(row) {
			let value = 0;
			for(const [_, item] of Object.entries(lineOptions.values)) {
				// :eyes:
				const itemValue = row[item as keyof typeof row];
				//assertNumber checks if itemValue is "number" type or not
				assertNumber(itemValue);
				value += itemValue;
			}

			if(doAverage) {
				average += value;
			}

			return value;
		});

		const color = teamMatches.map(function(row) {
			const checker = row.overall_was_defended;
			if (checker) {
				return 'rgba(224, 22, 22, 0.5)';
			}
			return 'rgba(65, 144, 223, 0.5)';
		});

		values.push({
			label: dataLine,
			data: data,
			backgroundColor: color,
		});

		if(doAverage) {
			if(teamMatches.length > 0) {
				average /= teamMatches.length;
			}
			averages.push({
				label: `Average ${dataLine}`,
				data: Array<number>(teamMatches.length).fill(average),
				pointRadius: 0,
			});
		}
	}

	function tooltip(items: TooltipItem<'line'>[]): string {
		const message = [];
		for(const dataPoint of items) {
			const match = teamMatches[dataPoint.dataIndex];

			if(!dataPoint.dataset.label) {
				continue;
			}

			const entry = config[dataPoint.dataset.label].values;

			message.push(`${dataPoint.dataset.label}:`);

			for(const [itemName, dataKey] of Object.entries(entry)) {
				message.push(`${itemName}: ${match[dataKey as keyof typeof match]}`);
			}

			if(tooltipCallback) {
				tooltipCallback(message, items);
			}
		}

		const lineLength = 80;
		const lineSep = "\n";
		const wrappedLines = message.map((l) => splitString(l, lineLength).join(lineSep));

		return wrappedLines.join(lineSep);
	}

	new Chart(canvas, {
		type: 'bar',
		data: {
			labels: matchNumbers,
			datasets: [...values, ...averages,]
		},
		
		options: {
			plugins: {
				tooltip: {
					callbacks: {
						footer: tooltip,
					}
				}
			}
		}
	});
}

export { DTFChartComponent, DTFAutonChartComponent, DTFTeleopChartComponent };

// ==========================
// Imports
// ==========================

import '../public/stylesheets/style.css';
import '../public/stylesheets/strategicScout.css';

import { useEffect, useState } from 'react';
import { useLocalStorage } from 'react-use';
import { Table } from 'antd';

import { Tabs } from '../parts/tabs.tsx';
import Header from '../parts/header.tsx';
import QrCode from '../parts/qrCodeViewer.tsx';

import {
	isInPlayoffs,
	getTeamsInMatch,
	getAllianceTags,
	parseRobotPosition,
	getRobotAllianceOptions
} from '../utils/tbaRequest.ts';

import { escapeUnicode } from '../utils/utils.ts';
import { getFieldAccessor } from '../parts/formItems.tsx';

import Form, {
	NumberInput,
	Select,
	Input,
	TextArea,
	Radio
} from '../parts/formItems.tsx';

import Constants from '../utils/constants.ts';

import type * as TbaApi from '../types/tbaApi.ts';
import type * as AllianceZoneTypes from '../types/allianceZone.ts';
import type * as Database from '../types/database.ts';
import type * as ResultTypes from '../types/resultTypes.ts';


// ==========================
// Default Form Values
// ==========================

const formDefaultValues: AllianceZoneTypes.Alliance = {
	"scouter_initials": "",
	"comp_level": "qm",
	"match_number": 0,
	"robot_alliance": "blue",
	"comments": "",
	"red_alliance": "",
	"blue_alliance": "",
	
	"team1Value": "best",  // default selected radio
	"team2Value": "best",
	"team3Value": "best",
} as const;


// ==========================
// Component
// ==========================

type Props = {
	title: string,
};

function allianceZone(props: Props): React.ReactElement {

	// ==========================
	// State
	// ==========================

	const [tabNum, setTabNum] = useState("1");
	const [team_number1, setTeamNumber1] = useState(0);
	const [team_number2, setTeamNumber2] = useState(0);
	const [team_number3, setTeamNumber3] = useState(0);
	const [teamsInMatch, setTeamsInMatch] = useState<ResultTypes.TeamsInMatch | null>(null);
	const [qrValue, setQrValue] = useState<unknown>();
	const [teamData, setTeamData] = useState<Database.StrategicEntry[] | null>(null);
	const [inPlayoffs, setInPlayoffs] = useState(false);
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);

	if (!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;
	const accessor = getFieldAccessor<AllianceZoneTypes.Alliance>();


	// ==========================
	// Effects
	// ==========================

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);



	// ==========================
	// Match Logic
	// ==========================

	async function updateTeamsInMatch(): Promise<void> {
		try {

			const compLevel = accessor.getFieldValue('comp_level');
			const matchNumber = accessor.getFieldValue('match_number');
			const blueAllianceNumber = Number(accessor.getFieldValue('blue_alliance'));
			const redAllianceNumber = Number(accessor.getFieldValue('red_alliance'));

			if (matchNumber <= 0) {
				return;
			}

			const teamsInMatch =
				await getTeamsInMatch(
					eventKey,
					compLevel,
					matchNumber,
					blueAllianceNumber,
					redAllianceNumber
				);

			if (!teamsInMatch) {
				console.error("Failed to get teams playing: teams is empty");
				return;
			}

			setTeamsInMatch(teamsInMatch);
			console.log(teamsInMatch)

			updateTeamNumber(teamsInMatch);

		} catch (err) {
			console.error("Failed to request TBA data when updating team number", err);
		}
	}


	function updateTeamNumber(teamsInMatch: ResultTypes.TeamsInMatch | null): void {
		if(!teamsInMatch) {
			return;
		}
		const robotAlliance = accessor.getFieldValue('robot_alliance');

		const teamNumber1 = teamsInMatch[robotAlliance][0];
		const teamNumber2 = teamsInMatch[robotAlliance][1];
		const teamNumber3 = teamsInMatch[robotAlliance][2];

		console.log(teamNumber1)
		setTeamNumber1(teamNumber1);
		setTeamNumber2(teamNumber2);
		setTeamNumber3(teamNumber3);


	}


	function calculateMatchLevel(): void {
		const matchLevel = accessor.getFieldValue('comp_level');
		const inPlayoffs = isInPlayoffs(matchLevel);
		setInPlayoffs(inPlayoffs);
	}


	async function trySubmit(event: AllianceZoneTypes.Alliance): Promise<void> {

		setNewAllianceZone(event);

		const scouter_initials = accessor.getFieldValue('scouter_initials');
		const match_number = accessor.getFieldValue('match_number');
		const comp_level = accessor.getFieldValue('comp_level');
		
		const robot_alliance = accessor.getFieldValue('robot_alliance');

		accessor.resetFields();

		accessor.setFieldValue('scouter_initials', scouter_initials);
		accessor.setFieldValue('comp_level', comp_level);
		accessor.setFieldValue("match_number", match_number + 1);
		accessor.setFieldValue('robot_alliance', robot_alliance);

		calculateMatchLevel();
		await updateTeamsInMatch();
	}


	async function runFormFinish(event: AllianceZoneTypes.Alliance): Promise<void> {
		try {
			await trySubmit(event);
		} catch (err) {
			console.error(err);
			window.alert("Error occured, please do not leave this message and notify a Webdev member immediately.");
		}
	}


	async function updateNumbers(): Promise<void> {
		calculateMatchLevel();
		await updateTeamsInMatch();

	}


	// ==========================
	// Submit Helpers
	// ==========================

	function setNewAllianceZone(event: AllianceZoneTypes.Alliance): void {
					// accessor.setFieldValue('team1', toString(Object.values(teamsInMatch).flat()[0]))

		const body: AllianceZoneTypes.SubmitBody = {
			"event_key": eventKey,
			"team_number1": teamsInMatch ? teamsInMatch[event.robot_alliance][0] : 0,
			"team_number2": teamsInMatch ? teamsInMatch[event.robot_alliance][1] : 1,
			"team_number3": teamsInMatch ? teamsInMatch[event.robot_alliance][2] : 2,
			"scouter_initials": event.scouter_initials.toLowerCase(),
			"comp_level": event.comp_level,
			"match_number": event.match_number,
			"robot_alliance": event.robot_alliance,
			"blue_alliance": event.blue_alliance,
			"red_alliance": event.red_alliance,
			"comments": event.comments,
			"team1Value": accessor.getFieldValue("team1Value"), // include selected radio
			"team2Value": accessor.getFieldValue("team2Value"),
			"team3Value": accessor.getFieldValue("team3Value"),
					};

		Object.entries(body)
			.forEach((entry) => {

				const [field, value] = entry;

				const newVal =
					typeof value === "string"
						? escapeUnicode(value)
						: value;

				const access = field as keyof typeof body;

				body[access] = newVal as unknown as never;
			});


		void tryFetch(body)
			.then((successful) => {
				if (successful) {
					window.alert("Submit successful.");
				} else {
					window.alert("Submit was not successful. Please show the QR to WebDev.");
				}
			});

		setQrValue(body);
	}


	async function tryFetch(body: AllianceZoneTypes.SubmitBody): Promise<boolean> {

		let fetchLink = Constants.SERVER_ADDRESS;

		if (!fetchLink) {
			console.error("Could not get fetch link; Check .env");
			return false;
		}

		fetchLink += "reqType=submitAllianceZoneData";

		const submitBody = {
			...body,
		};

		try {

			const res = await fetch(fetchLink, {
				method: "POST",
				body: JSON.stringify(submitBody),
				headers: {
					"Content-Type": "application/json",
				},
			});

			return res.ok;

		} catch (_) {
			return false;
		}
	}


	// ==========================
	// UI Sections
	// ==========================

	function preMatch(): React.ReactElement {

		type FieldType = AllianceZoneTypes.Pre;

		const compLevelOptions: { label: string, value: TbaApi.Comp_Level }[] = [
			{ label: "Qualifications", value: "qm" },
			{ label: "Playoffs", value: "sf" },
			{ label: "Finals", value: "f" },
		];

		const robot_alliance = getRobotAllianceOptions(teamsInMatch);
		console.log(robot_alliance)
		const playoff_alliances = getAllianceTags(eventKey);

		return (
			<>

				<Input<FieldType>
					name="scouter_initials"
					title="Scouter Initials"
					maxLength={2}
					pattern="^[A-Za-z]{1,2}$"
					message="Please enter only letters (max 2)"
					align="left"
				/>

				<Select<FieldType>
					title={"Match Level"}
					name={"comp_level"}
					options={compLevelOptions}
					onChange={updateNumbers}
				/>

				<div
					className={"playoff-alliances"}
					style={{ display: inPlayoffs ? 'inherit' : 'none' }}
				>
					<Select<FieldType>
						title={"Blue Alliance"}
						name={"blue_alliance"}
						required={inPlayoffs}
						message={"Enter the blue alliance"}
						options={playoff_alliances}
						onChange={updateNumbers}
					/>

					<Select<FieldType>
						title={"Red Alliance"}
						name={"red_alliance"}
						required={inPlayoffs}
						message={"Enter the red alliance"}
						options={playoff_alliances}
						onChange={updateNumbers}
					/>
				</div>

				<NumberInput<FieldType>
					title={"Match #"}
					name={"match_number"}
					message={"Enter match #"}
					onChange={updateNumbers}
					min={1}
					buttons={false}
					align={"left"}
				/>

				<Select<FieldType>
					title={"Robot Alliance"}
					name={"robot_alliance"}
					message={"Please input the robot alliance"}
					options={robot_alliance}
				/>

				<button
					type="button"
					onClick={() => { setTabNum("2"); }}
					className='tabButton'
				>
					Next
				</button>
			</>
		);
	}


	function AllianceZone(): React.ReactElement {

		let prevComments;
		type FieldType = AllianceZoneTypes.AllianceZone;

		if (teamData) {

			const columns = [
				{
					"title": 'Scouter Initials',
					"dataIndex": 'scouter_initials',
					"width": '70vw',
				},
				{
					"title": 'Match #',
					"dataIndex": 'match_number',
					"width": '10vw',
				},
			];

			const dataSource = [];

			for (const match of teamData) {
				dataSource.push({
					"key": `${match.id}`,
					"scouter_initials": `Scouter Initials: ${match.scouter_initials}`,
					"match_number": match.match_number,
					"comment": match.comments,
				});
			}

			prevComments =
				<Table
					columns={columns}
					dataSource={dataSource}
				>
				</Table>;

		} else {
			prevComments = <p>This team has not been scouted yet.</p>;
		}

		return (
			<div>
				{prevComments}

				<div className="fuelScoreSection">

					<div className="fuelHeader">
						<span></span>
						<span>Best</span>
						<span>Middle</span>
						<span>Worst</span>
					</div>

					{[1, 2, 3].map((i) => (
						<div className="fuelRow" key={i}>
							<div className="teamNumber">
								{teamsInMatch ?teamsInMatch[accessor.getFieldValue("robot_alliance")][i-1] : "--"}
							</div>

							<Radio<FieldType> title={"best"} name={`team${i}Value`as keyof AllianceZoneTypes.AllianceZone } value="best" />
							<Radio<FieldType> title={"middle"} name={`team${i}Value`as keyof AllianceZoneTypes.AllianceZone } value="middle" />
							<Radio<FieldType> title={"worst"} name={`team${i}Value`as keyof AllianceZoneTypes.AllianceZone } value="worst" />
						</div>
					))}
					{/* {`team_${i}`} */}

				</div>
				

				<TextArea<FieldType>
					title="Comments"
					name="comments"
					message="Please input some comments!"
				/>

				<button
					type='button'
					onClick={() => { setTabNum("1"); }}
					className='tabButton'
				>
					Back
				</button>

				<button type='submit' className='submitButton'>
					Submit
				</button>
			</div>
		);
	}


	// ==========================
	// Tabs
	// ==========================

	const items = [
		{
			key: '1',
			label: 'Pre',
			children: preMatch(),
		},
		{
			key: '2',
			label: 'AllianceZone',
			children: AllianceZone(),
		},
	];


	// ==========================
	// Return
	// ==========================

	return (
		<>
			<Header name={"Alliance Zone"} back="#scoutingapp/" />

			<alliance-zone>
				<Form<AllianceZoneTypes.Alliance>
					accessor={accessor}
					initialValues={formDefaultValues}
					onFinish={runFormFinish}
					onFinishFailed={(_values, errorFields) => {

						const errorMessage =
							Object.entries(errorFields)
								.map((x) => x[0])
								.join("\n");

						window.alert(errorMessage);
					}}
				>
					<Tabs
						defaultActiveKey="1"
						activeKey={tabNum}
						items={items}
						onChange={(key) => { setTabNum(key); }}
					/>
				</Form>

				<QrCode value={qrValue} />
			</alliance-zone>
		</>
	);
}

export default allianceZone;
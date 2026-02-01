import '../public/stylesheets/matchScout.css';
import { useEffect, useState } from 'react';
import { useLocalStorage, } from 'react-use';
import Header from '../parts/header';
import QrCode from '../parts/qrCodeViewer';
import { isInPlayoffs, getTeamsInMatch, getAllianceTags, getOpposingAllianceColor, parseRobotPosition, getRobotPositionOptions } from '../utils/tbaRequest.ts';
import { escapeUnicode, toTinyInt } from "../utils/utils";
import Form, { NumberInput, Select, Checkbox, Input, TextArea, Radio } from '../parts/formItems';
import { getFieldAccessor, } from '../parts/formItems';
import { Tabs, } from "../parts/tabs";
import Constants from '../utils/constants';

import type * as TbaApi from '../types/tbaApi';
import type { ResultTypes } from '../types/tbaRequest';
import type * as TbaRequest from '../types/tbaRequest';
import type * as MatchScoutTypes from '../types/matchScout';
import type { TabItems } from '../parts/tabs';

type Props = {
	title: string,
};

const formDefaultValues: MatchScoutTypes.All = {
	// Pre-match
	"scouter_initials": "",
	"comp_level": "qm",
	"match_number": 0,
	"robot_position": "B1",
	// Auton
	"auton_fuel_scored": 0,
	"auton_fuel_score_multiplier": "1x",
	"auton_shoot_location": [],
	"auton_intake_location": [],
	"auton_climb_attempted": false,
	"auton_climb_successful": false,
	// Teleop
	"teleop_fuel_scored": 0,
	"teleop_fuel_score_multiplier": "1x",
	"teleop_fuel_hoarded_amount": "",
	"teleop_primary_hoard_type": "",
	// Endgame
	"endgame_climb_attempted": false,
	"endgame_climb_level": "",
	"endgame_climb_successful": false,
	// Overall
	"overall_robot_died": false,
	"overall_defended_others": false,
	"overall_was_defended": false,
	"overall_defended": [],
	"overall_defended_by": [],
	"overall_path_to_neutral_zone": "",
	"overall_shoot_while_moving": false,
	"overall_shot_hoarded_pieces": false,
	"overall_comments": "",

	// Playoffs
	"red_alliance": "0",
	"blue_alliance": "0",

	"team_override": null,
} as const;
const noShowValues: Partial<MatchScoutTypes.All> = {
	// Pre-match
	//"match_event": "",
	//"team_number": 0,
	//"scouter_initials": "",
	//"comp_level": "",
	//"match_number": 0,
	//"robot_position": "",
	// Auton
	"auton_fuel_scored": 0,
	"auton_fuel_score_multiplier": "1x",
	"auton_shoot_location": [],
	"auton_intake_location": [],
	"auton_climb_attempted": false,
	"auton_climb_successful": false,
	// Teleop
	"teleop_fuel_scored": 0,
	"teleop_fuel_score_multiplier": "1x",
	"teleop_fuel_hoarded_amount": "None",
	"teleop_primary_hoard_type": "None",
	// Endgame
	"endgame_climb_attempted": false,
	"endgame_climb_level": "None",
	"endgame_climb_successful": false,
	// Overall
	"overall_robot_died": false,
	"overall_defended_others": false,
	"overall_was_defended": false,
	"overall_defended": [],
	"overall_defended_by": [],
	"overall_path_to_neutral_zone": "None",
	"overall_shoot_while_moving": false,
	"overall_shot_hoarded_pieces": false,
	"overall_comments": "Robot did not appear",
	// Playoffs
	//"red_alliance": "",
	//"blue_alliance": "",
} as const;

function MatchScout(props: Props): React.ReactElement {
	const [isLoading, setLoading] = useState(false);
	const [tabNum, setTabNum] = useState("1");
	const [team_number, setTeamNumber] = useState(0);
	const [auton_fuel_number, setAutonFuelNumber] = useState(0);
	const [teleop_fuel_number, setTeleopFuelNumber] = useState(0);
	const [auton_fuel_multiplier, setAutonFuelMultiplier] = useState(0);
	const [teleop_fuel_multiplier, setTeleopFuelMultiplier] = useState(0);
	const [teamsInMatch, setTeamsInMatch] = useState<ResultTypes.TeamsInMatch | null>(null);
	const [qrValue, setQrValue] = useState<unknown>();
	const [defendedIsVisible, setDefendedIsVisible] = useState(false);
	const [wasDefendedIsVisible, setWasDefendedIsVisible] = useState(false);
	const [autonClimbAttempted, setAutonClimbAttempted] = useState(false);
	const [penaltiesIsVisible, setPenaltiesIsVisible] = useState(false);
	const [opposingTeamNum, setOpposingTeamNum] = useState<number[]>([]);
	const [inPlayoffs, setInPlayoffs] = useState(false);
	const [robot_appeared, setRobot_appeared] = useState(true);
	const [climb_attempted, setClimbAttempted] = useState(false);
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;

	const accessor = getFieldAccessor<MatchScoutTypes.All>();

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);

	let currentRobotPosition: TbaRequest.RobotPosition | null = null;
	try {
		currentRobotPosition = accessor.getFieldValue('robot_position');
	} catch (err) {
		void err;
	}
	useEffect(() => {
		if(!teamsInMatch) {
			return;
		}

		if(!currentRobotPosition) {
			return;

		}

		const [currentColor, _] = parseRobotPosition(currentRobotPosition);
		const color = getOpposingAllianceColor(currentColor);

		const team = teamsInMatch[color];

		setOpposingTeamNum(team);
	}, [teamsInMatch, currentRobotPosition]);

	function submitData(event: MatchScoutTypes.All): void {
		if (team_number === 0) {
			window.alert("Team number is 0, please check in Pre.");
			return;
		}

		// TODO: write SubmitBody
		const body: MatchScoutTypes.SubmitBody = {
			// Pre-match
			"event_key": eventKey,
			"team_number": team_number,
			"scouter_initials": event.scouter_initials.toLowerCase(),
			"comp_level": event.comp_level,
			"match_number": event.match_number,
			"robot_position": event.robot_position,
			// Auton
			"auton_fuel_scored": auton_fuel_number,
			"auton_shoot_location": event.auton_shoot_location.sort().join(","),
			"auton_intake_location": event.auton_intake_location.sort().join(","),
			"auton_climb_attempted": toTinyInt(event.auton_climb_attempted),
			"auton_climb_successful": toTinyInt(event.auton_climb_successful),
			// Teleop
			"teleop_fuel_scored": teleop_fuel_number,
			"teleop_fuel_hoarded_amount": event.teleop_fuel_hoarded_amount,
			"teleop_primary_hoard_type": event.teleop_primary_hoard_type,
			// Endgame
			"endgame_climb_attempted": toTinyInt(event.endgame_climb_attempted),
			"endgame_climb_level": event.endgame_climb_level,
			"endgame_climb_successful": toTinyInt(event.endgame_climb_successful),
			// Overall
			"overall_robot_died": toTinyInt(event.overall_robot_died),
			"overall_defended_others": toTinyInt(event.overall_defended_others),
			"overall_was_defended": toTinyInt(event.overall_was_defended),
			"overall_defended": event.overall_defended.sort().join(","),
			"overall_defended_by": event.overall_defended_by.sort().join(","),
			"overall_path_to_neutral_zone": event.overall_path_to_neutral_zone,
			"overall_shoot_while_moving": toTinyInt(event.overall_shoot_while_moving),
			"overall_shot_hoarded_pieces": toTinyInt(event.overall_shot_hoarded_pieces),
			"overall_comments": event.overall_comments,
			"robot_appeared": toTinyInt(robot_appeared),
		};
		Object.entries(body)
			.forEach((k) => {
				const [field, val] = k

				const newVal = typeof val === "string" ?
					escapeUnicode(val) :
					val;

				// :eyes: :eyes: :eyes:
				const access = field as keyof typeof body;
				// :eyes: :eyes: :eyes:
				body[access] = newVal as unknown as never;
			});

		// Do not block
		void tryFetch(body)
			.then((successful) => {
				if(successful) {
					window.alert("Submit successful.");
				} else {
					window.alert("Submit was not successful. Please show the QR to WebDev.");
				}
			});

		setQrValue(body);
	}
	async function tryFetch(body: MatchScoutTypes.SubmitBody): Promise<boolean> {
		let fetchLink = Constants.SERVER_ADDRESS;

		if(!fetchLink) {
			console.error("Could not get fetch link; Check .env");
			return false;
		}

		//TODO: refactor
		fetchLink += "reqType=submitMatchData";

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

	async function onSubmit(event: MatchScoutTypes.All): Promise<void> {
		if(isLoading) {
			return;
		}

		setLoading(true);

		try {
			submitData(event);

			const scouter_initials = accessor.getFieldValue("scouter_initials");
			const match_number = accessor.getFieldValue("match_number");
			const comp_level = accessor.getFieldValue("comp_level");
			const robot_position = accessor.getFieldValue("robot_position");

			accessor.resetFields();

			accessor.setFieldValue("scouter_initials", scouter_initials);
			accessor.setFieldValue("comp_level", comp_level);
			accessor.setFieldValue("match_number", match_number + 1);
			accessor.setFieldValue("robot_position", robot_position);

			setRobot_appeared(true);
			setWasDefendedIsVisible(false);
			setDefendedIsVisible(false);
			setAutonFuelNumber(0);
			setAutonClimbAttempted(false);

			await updateNumbers();
		} catch (err) {
			console.log(`err=`, err);
		} finally {
			setLoading(false);
		}
	}

	async function updateNumbers(): Promise<void> {
		const compLevel = accessor.getFieldValue('comp_level');

		const inPlayoffs = isInPlayoffs(compLevel);

		setInPlayoffs(inPlayoffs);

		await updateTeamsInMatch();
	}
	async function updateTeamsInMatch(): Promise<void> {
		try {
			const compLevel = accessor.getFieldValue('comp_level');
			const matchNumber = accessor.getFieldValue('match_number');
			const blueAllianceNumber = Number(accessor.getFieldValue('blue_alliance'));
			const redAllianceNumber = Number(accessor.getFieldValue('red_alliance'));

			if(matchNumber <= 0) {
				return;
			}

			const teamsInMatch = await getTeamsInMatch(eventKey, compLevel, matchNumber, blueAllianceNumber, redAllianceNumber);

			if(!teamsInMatch) {
				console.error("Failed to get teams playing: teams is empty");
				return;
			}

			setTeamsInMatch(teamsInMatch);

			updateTeamNumber(teamsInMatch);
		} catch (err) {
			console.error("Failed to request TBA data when updating team number", err);
		}
	}
	function updateTeamNumber(teamsInMatch: ResultTypes.TeamsInMatch | null): void {
		if(!teamsInMatch) {
			return;
		}
		const robotPosition = accessor.getFieldValue('robot_position');

		const [color, index] = parseRobotPosition(robotPosition);
		const teamNumber = teamsInMatch[color][index];

		setTeamNumber(teamNumber);
	}
	function updatePenalties(): void {
		const major = accessor.getFieldValue("overall_major_penalties");
		const minor = accessor.getFieldValue("overall_minor_penalties");

		const shouldShow = major + minor > 0;

		setPenaltiesIsVisible(shouldShow);
	}

	function preMatch(): React.ReactElement {
		type FieldType = MatchScoutTypes.PreMatch;

		const compLevelOptions: { label: string, value: TbaApi.Comp_Level }[] = [
			{ label: "Qualifications", value: "qm" },
			{ label: "Playoffs", value: "sf" },
			{ label: "Finals", value: "f" },
		];

		const robot_position = getRobotPositionOptions(teamsInMatch);
		const playoff_alliances = getAllianceTags(eventKey);

		return (
			<>
				<h2>Team: {team_number}</h2>

				<Input<FieldType>
					title="Scouter Initials"
					name="scouter_initials"
					pattern="^[a-zA-Z]{1,2}$"
					message="Please input your initials (1-2 letters only)"
					align="left"
					required
				/>

				<Select<FieldType>
					title={"Match Level"}
					name={"comp_level"}
					options={compLevelOptions}
					onChange={updateNumbers}
				/>

				<div className={"playoff-alliances"} style={{ display: inPlayoffs ? 'inherit' : 'none' }}>
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
					message={"Please enter match #"}
					onChange={updateNumbers}
					min={1}
					buttons={false}
					align={"left"}
				/>

				<Select<FieldType>
					title={"Robot Position"}
					name={"robot_position"}
					message={"Enter robot position"}
					options={robot_position}
					onChange={() => { updateTeamNumber(teamsInMatch); }}
				/>

				<details className="overrideOptions">
					<summary>Warning! These options should not be used normally!</summary>
					<NumberInput<FieldType>
						title={"Override Team"}
						name={"team_override"}
						required={false}
						onChange={(e: number) => {
							setTeamNumber(e);
						}}
						min={0}
						buttons={false}
						align={"left"}
					/>

					<button
						type="button"
						className={"noShowButton"}
						onMouseDown={() => {
							const confirmed = window.confirm("Are you sure that this robot did not appear?");

							if(!confirmed) {
								return;
							}

							const values = {...noShowValues};

							setTabNum("5");
							accessor.setFormValues(values);
							setRobot_appeared(false);
						}}
					>No Show</button>
				</details>
			</>
		);
	}

	function autonMatch(): React.ReactElement {
		type FieldType = MatchScoutTypes.AutonMatch;
		const shootLocation = [
			{ label: "Tower", value: "Tower" },
			{ label: "Outpost", value: "Outpost" },
			{ label: "Depot", value: "Depot" },
			{ label: "Trench", value: "Trench" },
		];
		const intakeLocation = [
			{ label: "Neutral", value: "Neutral" },
			{ label: "Outpost", value: "Outpost" },
			{ label: "Depot", value: "Depot" },
		];

		return (
			<div style={{ alignContent: 'center' }}>
				
				<NumberInput<FieldType>
					title={"Fuel Scored"}
					name={"auton_fuel_scored"}
					defaultValue={auton_fuel_number}
					message={"Enter # fuel scored in Auton"}
					buttons={false}
					value={auton_fuel_number}
					min={0}
					disabled
				/>

				<button
				className={"plusButton"}
				type="button"
				onMouseDown={() => {
					setAutonFuelNumber(auton_fuel_number + auton_fuel_multiplier);
						}}
				>+</button>

				<button
				className={"minusButton"}
				type="button"
				onMouseDown={() => {
					let new_fuel_number = auton_fuel_number - auton_fuel_multiplier;
					if(new_fuel_number < 0){
						new_fuel_number = 0;
					}
					setAutonFuelNumber(new_fuel_number);
						}}
				>-</button>

				<b>Fuel Score Multiplier</b>

				<div className="inputRow">
					<Radio<FieldType>
						name={"auton_fuel_score_multiplier"}
						title={"1x"}
						value={"1x"}
						onChange={() => {setAutonFuelMultiplier(1);}}
					/>

					<Radio<FieldType>
						name={"auton_fuel_score_multiplier"}
						title={"2x"}
						value={"2x"}
						onChange={() => {setAutonFuelMultiplier(2);}}
					/>

					<Radio<FieldType>
						name={"auton_fuel_score_multiplier"}
						title={"5x"}
						value={"5x"}
						onChange={() => {setAutonFuelMultiplier(5);}}
					/>
				</div>

				<Select<FieldType>
					title={"Shoot Location"}
					name={"auton_shoot_location"}
					options={shootLocation}
					multiple
				/>

				<Select<FieldType>
					title={"Intake Location"}
					name={"auton_intake_location"}
					options={intakeLocation}
					multiple
				/>

				<Checkbox<FieldType>
					name={"auton_climb_attempted"}
					title={"Climb Attempted"}
					onChange={() => {
							setAutonClimbAttempted(!autonClimbAttempted);
						}}
				/>

				<div
					style={{
						display: autonClimbAttempted ? 'inherit' : 'none' ,
					}}
				>
					<Checkbox<FieldType>
						name={"auton_climb_successful"}
						title={"Climb Successful"}
						required={autonClimbAttempted}
						//onChange={}
					/>
				</div>
			</div>
		);
	}

	function teleopMatch(): React.ReactElement {
		type FieldType = MatchScoutTypes.TeleopMatch;
		const teleop_fuel_hoarded_amount = [
			{ label: "High", value: "High" },
			{ label: "Medium", value: "Medium" },
			{ label: "Low", value: "Low" },
			{ label: "None", value: "None" },
		];
		const teleop_primary_hoard_type= [
			{ label: "Push Hoard", value: "Push_Hoard" },
			{ label: "Shoot Hoard", value: "Shoot_Hoard" },
			{ label: "Dump Hoard", value: "Dump_Hoard" },
			{ label: "None", value: "None" },
		];

		return (
			<div>
				<NumberInput<FieldType>
					title={"Fuel Scored"}
					name={"teleop_fuel_scored"}
					defaultValue={teleop_fuel_number}
					message={"Enter # fuel scored in Teleop"}
					buttons={false}
					value={teleop_fuel_number}
					min={0}
					disabled
				/>

				<button
				className={"plusButton"}
				type="button"
				onMouseDown={() => {
					setTeleopFuelNumber(teleop_fuel_number + teleop_fuel_multiplier);
						}}
				>+</button>

				<button
				className={"minusButton"}
				type="button"
				onMouseDown={() => {
					let new_fuel_number = teleop_fuel_number - teleop_fuel_multiplier;
					if(new_fuel_number < 0){
						new_fuel_number = 0;
					}
					setTeleopFuelNumber(new_fuel_number);
						}}
				>-</button>

				<b>Fuel Score Multiplier</b>

				<div className="inputRow">
					<Radio<FieldType>
						name={"teleop_fuel_score_multiplier"}
						title={"1x"}
						value={"1x"}
						onChange={() => {setTeleopFuelMultiplier(1);}}
					/>

					<Radio<FieldType>
						name={"teleop_fuel_score_multiplier"}
						title={"2x"}
						value={"2x"}
						onChange={() => {setTeleopFuelMultiplier(2);}}
					/>

					<Radio<FieldType>
						name={"teleop_fuel_score_multiplier"}
						title={"5x"}
						value={"5x"}
						onChange={() => {setTeleopFuelMultiplier(5);}}
					/>
				</div>

				<Select<FieldType>
					title={"Fuel Hoarded Amount"}
					name={"teleop_fuel_hoarded_amount"}
					message={"Enter fuel hoarded amount"}
					options={teleop_fuel_hoarded_amount}
				/>

				<Select<FieldType>
					title={"Primary Hoard Type"}
					name={"teleop_primary_hoard_type"}
					message={"Enter primary hoard type"}
					options={teleop_primary_hoard_type}
				/>
			</div>
		);
	}

	function endgameMatch(): React.ReactElement {
		type FieldType = MatchScoutTypes.EndgameMatch;
		const endgame_climb_level = [
			{ label: "Level 1", value: "Level_1" },
			{ label: "Level 2", value: "Level_2" },
			{ label: "Level 3", value: "Level_3" },
			{ label: "None", value: "None" },
		];
		return (
			<>
				<Checkbox<FieldType>
					name="endgame_climb_attempted"
					title="Climb Attempted?"
					onChange={(event) => {
						setClimbAttempted(event);
					}}
				/>

				<div
					style={{
						display: climb_attempted ? 'inherit' : 'none' ,
					}}
				>
					<Select<FieldType>
					title={"Climb Level"}
					name={"endgame_climb_level"}
					message={"Enter climb level"}
					options={endgame_climb_level}
				/>

				<Checkbox<FieldType>
					name="endgame_climb_successful"
					title="Climb Successful?"
				/>
				</div>
			</>
		)}

	function overallMatch(): React.ReactElement {
		type FieldType = MatchScoutTypes.OverallMatch;

		const opposingTeams = opposingTeamNum.map((team) => ({ label: team.toString(), value: team.toString() }));
		const overall_path_to_neutral_zone = [
			{ label: "Bump", value: "Bump" },
			{ label: "Trench", value: "Trench" },
			{ label: "Both", value: "Both" },
			{ label: "None", value: "None" },
		];

		return (
			<div className='matchbody'>
				<div className="inputRow">
					<Checkbox<FieldType>
						title="Robot died?"
						name="overall_robot_died"
					/>
					<Checkbox<FieldType>
						title="Defended others?"
						name="overall_defended_others"
						onChange={() => {
							setDefendedIsVisible(!defendedIsVisible);
						}}
					/>
					
					<Checkbox<FieldType>
						title="Was Defended?"
						name="overall_was_defended"
						onChange={() => {
							setWasDefendedIsVisible(!wasDefendedIsVisible);
						}}
					/>
				</div>

				<div
					style={{
						display: defendedIsVisible ? 'inherit' : 'none' ,
					}}
				>
					<Select<FieldType>
						title={"Defended"}
						name={"overall_defended"}
						required={defendedIsVisible}
						message={"Please select the teams it defended"}
						options={opposingTeams}
						multiple
					/>
				</div>

				<div
					style={{
						display: wasDefendedIsVisible ? 'inherit' : 'none' ,
					}}
				>
					<Select<FieldType>
						title={"Defended By"}
						name={"overall_defended_by"}
						required={wasDefendedIsVisible}
						message={"Please select the teams it was defended by"}
						options={opposingTeams}
						multiple
					/>
				</div>

				<Select<FieldType>
					title={"Path to Neutral Zone"}
					name={"overall_path_to_neutral_zone"}
					message={"Enter path to neutral zone"}
					options={overall_path_to_neutral_zone}
				/>

				<Checkbox<FieldType>
						title="Shoot While Moving"
						name="overall_shoot_while_moving"
				/>

				<Checkbox<FieldType>
						title="Shoot While Moving"
						name="overall_shot_hoarded_pieces"
				/>

				<TextArea<FieldType>
					title="Comments"
					name="overall_comments"
					message="Please enter some comments!"
				/>
			</div>
		)
	}

	const items: TabItems = [
		{
			key: '1',
			label: 'Pre',
			children: preMatch(),
		},
		{
			key: '2',
			label: 'Auton',
			children: autonMatch(),
		},
		{
			key: '3',
			label: 'Teleop',
			children: teleopMatch(),
		},
		{
			key: '4',
			label: 'Endgame',
			children: endgameMatch(),
		},
		{
			key: '5',
			label: 'Overall',
			children: overallMatch(),
		},
	];
	return (
		<>
			<Header name="Match Scout" back="#scoutingapp" />

			<match-scout>
				<Form<MatchScoutTypes.All>
					initialValues={formDefaultValues}
					onFinish={onSubmit}
					onFinishFailed={(_values, errorFields) => {
						const errorMessage = Object.entries(errorFields).map((x) => x[0]).join("\n");
						window.alert(errorMessage);
					}}
					accessor={accessor}
				>
					<Tabs defaultActiveKey="1" activeKey={tabNum} items={items} onChange={(key) => { setTabNum(key) }} />
					<footer>
						{Number(tabNum) > 1 && (
							<button type="button" onMouseDown={() => { setTabNum((Number(tabNum) - 1).toString())}} className='tabButton'>Back</button>
						)}
						{Number(tabNum) < items.length && (
							<button type="button" onMouseDown={() => { setTabNum((Number(tabNum) + 1).toString())}} className='tabButton'>Next</button>
						)}
						{Number(tabNum) === items.length && (
							<button type="submit" className='submitButton'>Submit</button>
						)}
						{isLoading &&
							<h2>Submitting data...</h2>
						}
					</footer>
				</Form>
				<QrCode value={qrValue} />
			</match-scout>
		</>
	);
}

export default MatchScout;

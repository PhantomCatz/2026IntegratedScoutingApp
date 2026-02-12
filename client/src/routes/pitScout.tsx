import '../public/stylesheets/pitScout.css';
import { useLocalStorage, } from 'react-use';
import { useState, useEffect, useRef } from 'react';
import Header from '../parts/header';
import QrCode from '../parts/qrCodeViewer';
import { getTeamsNotScouted, } from '../utils/tbaRequest.ts';
import { readImage, escapeUnicode } from '../utils/utils';
import Form, { NumberInput, Select, Input, Checkbox, TextArea } from '../parts/formItems';
import { getFieldAccessor } from '../parts/formItems';
import Constants from '../utils/constants';

import type * as TbaApi from '../types/tbaApi';
import type * as PitScoutTypes from '../types/pitScout';

type Props = {
	title: string,
};

const formDefaultValues = {
	"team_number": 0,
	"scouter_initials": "",
	"robot_weight": 0,
	"drive_train_type": "",
	"driving_motor_type": "",
	"number_of_driving_motors": 0,
	"wheel_type": "",
	"fuel_intake_location": "",
	"intake_type": "",
	"intake_width": "",
	"max_fuel_capacity": 0,
	"max_shot_range": "",
	"auto_aim": false,
	"trench_capability": false,
	"climb_during_auto": false,
	"can_climb_l1": false,
	"can_climb_l2": false,
	"can_climb_l3": false,
	"pit_organization": 4,
	"team_safety": 4,
	"team_workmanship": 4,
	"gracious_professionalism": 4,
	"comments": "",
} as const;

const IMAGE_DELIMITER = "$";

function PitScout(props: Props): React.ReactElement {
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);
	const [isLoading, setLoading] = useState(false);
	const [qrValue, setQrValue] = useState<unknown>();
	const [robotImageURI, setRobotImageURI] = useState<string[]>([]);
	const robotImageInput = useRef<HTMLInputElement>(null);
	const [refresh, setRefresh] = useState(false);

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}
	const eventKey = _eventKey;

	const accessor = getFieldAccessor<PitScoutTypes.Pit>();

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	useEffect(() => {
		void (async function() {
			const initialMessage = "Teams not scouted:";
			let message = initialMessage;

			try {
				const teamsNotScouted = await getTeamsNotScouted(eventKey);

				if(teamsNotScouted === null) {
					throw new Error("Could not access teams");
				}

				teamsNotScouted.sort((a, b) => a - b);

				message += teamsNotScouted.join("\n");

				if(message === initialMessage) {
					window.alert("All teams have been scouted.");
				} else {
					window.alert(message);
				}
			} catch (err) {
				console.error("Error in fetching teams: ", err);
			}})();
	}, [eventKey]);

	function submitData(event: PitScoutTypes.Pit): void {
		const body: PitScoutTypes.SubmitBody = {
			"match_event": eventKey,
			"team_number": event.team_number,
			"scouter_initials": event.scouter_initials.toLowerCase(),
			"robot_weight": event.robot_weight,
			"drive_train_type": event.drive_train_type,
			"driving_motor_type": event.driving_motor_type,
			"number_of_driving_motors": event.number_of_driving_motors,
			"wheel_type": event.wheel_type,
			"fuel_intake_location": event.fuel_intake_location,
			"intake_width": event.intake_width,
			"intake_type": event.intake_type.join(','),
			"max_fuel_capacity": event.max_fuel_capacity,
			"max_shot_range": event.max_shot_range,
			"auto_aim": event.auto_aim,
			"trench_capability": event.trench_capability,
			"climb_during_auto": event.climb_during_auto,
			"can_climb_l1": event.can_climb_l1,
			"can_climb_l2": event.can_climb_l2,
			"can_climb_l3": event.can_climb_l3,
			"pit_organization": event.pit_organization,
			"team_safety": event.team_safety,
			"team_workmanship": event.team_workmanship,
			"gracious_professionalism": event.gracious_professionalism,
			"comments": event.comments,
		};
		Object.entries(body)
			.forEach((item) => {
				const [field, value] = item;

				const newVal = typeof value === "string" ?
					escapeUnicode(value) :
					value;

				// :eyes: :eyes: :eyes:
				const access = field as keyof typeof body;
				// :eyes: :eyes: :eyes:
				body[access] = newVal as unknown as never;
			});

		void tryFetch(body)
			.then((successful) => {
				if(successful) {
					window.alert("Submit successful.");
				} else {
					window.alert("Submit was not successful. Please show the QR to WebDev. You will have to manually submit pictures.");
				}
			});

		setQrValue(body);
	}
	async function tryFetch(body: PitScoutTypes.SubmitBody): Promise<boolean> {
		let fetchLink = Constants.SERVER_ADDRESS;

		if(!fetchLink) {
			console.error("Could not get fetch link; Check .env");
			return false;
		}

		fetchLink += "reqType=submitPitData";

		const imageData = robotImageURI.join(IMAGE_DELIMITER);

		const submitBody = {
			...body,
			robotImageURI: imageData,
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
		} catch (err) {
			console.error(`Failed to submit data:`, err);

			return false;
		}
	}
	function Pit(): React.ReactElement {
		type FieldType = PitScoutTypes.Pit;
		const drive_train_options = [
			{ label: "Tank", value: "Tank" },
			{ label: "Swerve", value: "Swerve" },
			{ label: "H-Drive", value: "H-Drive" },
			{ label: "Other", value: "Other" },
		];
		const driving_motor_type_options = [
			{ label: "Falcon", value: "Falcon" },
			{ label: "Kraken", value: "Kraken" },
			{ label: "NEO", value: "NEO" },
			{ label: "CIM", value: "CIM" },
			{ label: "Other", value: "Other" },
		];
		const wheel_type_options = [
			{ label: "Molded/SpikeGrip", value: "Molded/SpikeGrip" },
			{ label: "TPU", value: "TPU" },
			{ label: "Nitrile", value: "Nitrile" },
			{ label: "Colson", value: "Colson" },
			{ label: "Pneumatic", value: "Pneumatic" },
			{ label: "Omni", value: "Omni" },
			{ label: "Mechanum", value: "Mechanum" },
			{ label: "Other", value: "Other" },
		];
		const fuel_intake_location_options = [
			{ label: "Ground", value: "Ground" },
			{ label: "Outpost", value: "Outpost" },
			{ label: "Both", value: "Both" },
		];
		const intake_type_options = [
			{ label: "Over Bumper", value: "Over Bumper" },
			{ label: "Through Bumper", value: "Through Bumper" },
			{ label: "Hopper", value: "Hopper" },
			{ label: "No Intake", value: "No Intake" },
		];
		const intake_width_options = [
			{ label: "100", value: "100" },
			{ label: "75", value: "75" },
			{ label: "50", value: "50" },
			{ label: "25", value: "25" },
		];
		const algae_intake_capability_options = [
			{ label: "Reef Zone", value: "Reef Zone" },
			{ label: "Ground", value: "Ground" },
			{ label: "Both", value: "Both" },
			{ label: "Neither", value: "Neither" },
		];
		const algae_scoring_capability_options = [
			{ label: "Net", value: "Net" },
			{ label: "Processor", value: "Processor" },
			{ label: "Both", value: "Both" },
			{ label: "Neither", value: "Neither" },
		];
		const score_aiming_coral_options = [
			{ label: "Manual", value: "Manual" },
			{ label: "Auto", value: "Auto" },
			{ label: "Neither", value: "Neither" },
		];
		const score_aiming_algae_options = [
			{ label: "Manual", value: "Manual" },
			{ label: "Auto", value: "Auto" },
			{ label: "Neither", value: "Neither" },
		];
		const climbing_capability_options = [
			{ label: "Shallow", value: "Shallow" },
			{ label: "Deep", value: "Deep" },
			{ label: "Both", value: "Both" },
			{ label: "Neither", value: "Neither" },
		];
		const max_shot_range_options = [
			{ label: "Opponent Alliance Zone", value: "Opponent Alliance Zone" },
			{ label: " Opponent Neutral Zone", value: " Opponent Neutral Zone" },
			{ label: "Neutral Zone", value: "Neutral Zone" },
			{ label: "Alliance Zone", value: "Alliance Zone" },
		];
		return (
			<>
				<Input<FieldType>
					title="Scouter Initials"
					name="scouter_initials"
					pattern="^[a-zA-Z]{1,2}$"
					message="Please input your initials (1-2 letters only)"
					align="left"
					required
				/>

				<NumberInput<FieldType>
					title={"Team #"}
					name={"team_number"}
					message={"Please input the team number"}
					min={1}
					max={99999}
					buttons={false}
					align={"left"}
				/>

				<NumberInput<FieldType>
					title={"Robot Weight (lbs)"}
					name={"robot_weight"}
					message={"Please input the robot weight in lbs"}
					min={0}
					max={1000}
					align={"left"}
				/>

				<Select<FieldType>
					title={"Drive Train Type"}
					name={"drive_train_type"}
					message={"Please input the drive train type"}
					options={drive_train_options}
				/>
				<Select<FieldType>
					title={"Driving Motor Type"}
					name={"driving_motor_type"}
					message={"Please input the driving motor type"}
					options={driving_motor_type_options}
				/>
				<NumberInput<FieldType>
					title={"# of Driving Motors"}
					name={"number_of_driving_motors"}
					message={"Please input the number of driving motors"}
					min={0}
					align={"left"}
				/>
				<Select<FieldType>
					title={"Wheel Type"}
					name={"wheel_type"}
					message={"Please input the wheel type"}
					options={wheel_type_options}
				/>
				<Select<FieldType>
					title={"Fuel Intake Location"}
					name={"fuel_intake_location"}
					message={"Please input the fuel intake location"}
					options={fuel_intake_location_options}
				/>
				<Select<FieldType>
					title={"Intake Type"}
					name={"intake_type"}
					message={"Please input the intake type"}
					options={intake_type_options}
					multiple
				/>
				<Select<FieldType>
					title={"Intake Width"}
					name={"intake_width"}
					message={"Please input the intake width"}
					options={intake_width_options}
				/>
				<NumberInput<FieldType>
					title={"Max Fuel Capacity"}
					name={"max_fuel_capacity"}
					message={"Please input the fuel capacity"}
					min={0}
					max={99999}
					buttons={false}
					align={"left"}
				/>
				<Select<FieldType>
					title={"Max Shot Range"}
					name={"max_shot_range"}
					message={"Please input the max shot range"}
					options={max_shot_range_options}
				/>
				<Checkbox<FieldType>
                    name="auto_aim"
                    title="Auto Aim"
                />
				<Checkbox<FieldType>
                    name="trench_capability"
                    title="Trench Capability"
                />
				<Checkbox<FieldType>
                    name="climb_during_auto"
                    title="Climb during auto?"
                />

				<h1>Climbing Capability</h1>
				<Checkbox<FieldType>
					title="L1"
					name="can_climb_l1"
				/>
				<Checkbox<FieldType>
					title="L2"
					name="can_climb_l2"
				/>
				<Checkbox<FieldType>
					title="L3"
					name="can_climb_l3"
				/>
				<NumberInput<FieldType>
					title={"Pit Organization(0-4)"}
					name={"pit_organization"}
					message={"Please input pit organization rating"}
					min={0}
					max={4}
					align={"left"}
				/>

				<NumberInput<FieldType>
					title={"Team Safety(0-4)"}
					name={"team_safety"}
					message={"Please input team safety rating"}
					min={0}
					max={4}
					align={"left"}
				/>

				<NumberInput<FieldType>
					title={"Team Workmanship(0-4)"}
					name={"team_workmanship"}
					message={"Please input team workmanship rating"}
					min={0}
					max={4}
					align={"left"}
				/>

				<NumberInput<FieldType>
					title={"Gracious Professionalism(0-4)"}
					name={"gracious_professionalism"}
					message={"Please input GP rating"}
					min={0}
					max={4}
					align={"left"}
				/>

				<TextArea<FieldType>
					name="comments"
					title="Comments"
				/>
				<h2 style={{ display: isLoading ? 'inherit' : 'none' }}>Submitting data...</h2>

				<label className="robotImageLabel" htmlFor="robotImageInput">Select Image {`(${robotImageInput.current?.files?.length ?? 0} images)`}</label>
				<input
					ref={robotImageInput}
					type="file"
					accept="image/*"
					multiple
					onChange={function() {
						setRefresh(!refresh);
					}}
				/>
				<input type="submit" value="Submit" className='submit' />
			</>
		);
	}
	return (
		<>
			<Header name={"Pit Scout"} back={"#scoutingapp"}/>

			<pit-scout>
				<Form<PitScoutTypes.Pit>
					accessor={accessor}
					initialValues={formDefaultValues}
					onFinish={async (event) => {
						if(isLoading) {
							return;
						}
						try {
							setLoading(true);

							submitData(event);

							const initials = accessor.getFieldValue("scouter_initials");

							accessor.resetFields();

							if(robotImageInput.current && robotImageInput.current.files) {
								const fileList: FileList = robotImageInput.current.files;

								const parsedFiles: string[] = await Promise.all(fileList[Symbol.iterator]().map(readImage));

								setRobotImageURI(parsedFiles)
								robotImageInput.current.value = "";
							}

							accessor.setFormValues({...formDefaultValues, "scouter_initials": initials});
						}
						catch (err) {
							console.error(err);
							window.alert("Error occured, please do not leave this message and notify a Webdev member immediately.");
							window.alert(err);
						}
						finally {
							setLoading(false);
						}
					}}
					onFinishFailed={(_values, errorFields) => {
						const errorMessage = Object.entries(errorFields).map((x) => x[0]).join("\n");
						window.alert(errorMessage);
					}}
				>
					<Pit />
				</Form>
				<QrCode value={qrValue} />
			</pit-scout>
		</>
	);
}

export default PitScout;

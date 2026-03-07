import '../public/stylesheets/dtfHome.css';
import Header from '../parts/header';
import { useEffect } from 'react';
import { getFieldAccessor} from '../parts/formItems';
import {  getTeamsInMatch, teamsPlayingToTeamsList } from '../utils/tbaRequest.ts';
import Constants from '../utils/constants';
import Form, { NumberInput, Select } from '../parts/formItems';
import { teamKeysToNumbers } from '../utils/tbaRequest';
import { useLocalStorage, } from 'react-use';

import type * as DtfHomeType from '../types/dtfHome';
import type * as TbaApi from '../types/tbaApi';
import type * as TbaRequest from '../types/tbaRequest';
import type * as LocalStorage from '../types/localStorage';

export type Props = {
	title: string;
};

function DTFHome(props: Props): React.ReactElement {
	type FieldType = DtfHomeType.All;
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);
	const [dtfSavedForm, setDTFSavedForm] = useLocalStorage<Partial<DtfHomeType.All>>('dtfSavedForm', {});

	const accessor = getFieldAccessor<DtfHomeType.All>();

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	useEffect(() => {
		if(!dtfSavedForm) {
			return;
		}

		Object.entries(dtfSavedForm).forEach(([key, value]) => {
			accessor.setFieldValue(key as keyof DtfHomeType.All, value);
		});
	}, []);

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;
	function fromEliminationAllianceNumbers(): TbaRequest.ResultTypes.TeamsInMatch | null {
		const playoffAlliances = localStorage.getItem("tbaPlayoffAlliances");

		if(playoffAlliances === null) {
			return null;
		}

		const data = JSON.parse(playoffAlliances) as LocalStorage.PlayoffAlliances | null;

		if(!data || !data[eventKey]) {
			return null;
		}

		if (!accessor.getFieldValue('elimsAlliance1') && !accessor.getFieldValue('elimsAlliance2')) {
			return null;
		}
		const result = {
			//eslint-disable-next-line @typescript-eslint/no-magic-numbers
			blue: teamKeysToNumbers(data[eventKey][Number(accessor.getFieldValue('elimsAlliance1'))].picks.slice(0,3)),
			//eslint-disable-next-line @typescript-eslint/no-magic-numbers
			red: teamKeysToNumbers(data[eventKey][Number(accessor.getFieldValue('elimsAlliance2'))].picks.slice(0,3)),
		};

		return result;
	}
	const allianceTeamOptions: { label: string, value: DtfHomeType.ElimsAlliance }[] = [
		{ label: "", value: "" },
		{ label: "Alliance 1", value: "0" },
		{ label: "Alliance 2", value: "1" },
		{ label: "Alliance 3", value: "2" },
		{ label: "Alliance 4", value: "3" },
		{ label: "Alliance 5", value: "4" },
		{ label: "Alliance 6", value: "5" },
		{ label: "Alliance 7", value: "6" },
		{ label: "Alliance 8", value: "7" },
	];

	///function that auto-fills the fields in team 1-3
	function updateAlliance1(): void {
		if (accessor.getFieldValue('elimsAlliance1') === "") {
			for (let k = 0; k < Constants.TEAMS_PER_ALLIANCE; k++) {
				accessor.setFieldValue(`teamNumber${k+1}` as keyof DtfHomeType.All, 0);
			}
		}
		else {
			const teamsInMatch = fromEliminationAllianceNumbers();

			if (!teamsInMatch) {
				return;
			}

			const blueList = teamsInMatch.blue;

			for (let n = 0; n < Constants.TEAMS_PER_ALLIANCE; n++){
				accessor.setFieldValue(`teamNumber${n+1}` as keyof DtfHomeType.All, blueList[n]);
			}
		}
	}

	function updateAlliance2(): void {
		if (accessor.getFieldValue('elimsAlliance2') === "") {
			for (let l = 0; l < Constants.TEAMS_PER_ALLIANCE; l++) {
				accessor.setFieldValue(`teamNumber${l+1 + Constants.TEAMS_PER_ALLIANCE}` as keyof DtfHomeType.All, 0);
			}
		}
		else {
			const teamsInMatch = fromEliminationAllianceNumbers();

			if (!teamsInMatch) {
				return;
			}

			const redList = teamsInMatch.red;
			for (let i = 0; i < Constants.TEAMS_PER_ALLIANCE; i++) {
				accessor.setFieldValue(`teamNumber${i+1 + Constants.TEAMS_PER_ALLIANCE}` as keyof DtfHomeType.All, redList[i]);
			}
		}
	}

	async function updateNumbers(): Promise<void> {
		const matchNumber = accessor.getFieldValue('qualMatch');

		const teamsInMatch = await getTeamsInMatch(eventKey, "qm", matchNumber, 0, 0);
		const teamsList = teamsPlayingToTeamsList(teamsInMatch);

		for(let i = 0; i < Constants.TEAMS_PER_ALLIANCE * Constants.NUM_ALLIANCES; i++) {
			accessor.setFieldValue(`teamNumber${i + 1}` as keyof DtfHomeType.All, teamsList[i]);
		}
	}

	const teamInput: React.ReactElement[] = [];

	const teamNumberInput = [];

	for(let allianceNumber = 1; allianceNumber <= Constants.NUM_ALLIANCES; allianceNumber++) {
		for(let teamNumber = 1; teamNumber <= Constants.TEAMS_PER_ALLIANCE; teamNumber++) {
			const teamNumberId: keyof DtfHomeType.All = `teamNumber${teamNumber + Constants.TEAMS_PER_ALLIANCE * (allianceNumber - 1)}` as keyof DtfHomeType.All;

			teamNumberInput.push(
				<NumberInput<FieldType>
					key={teamNumberId}
					name={teamNumberId}
					title={`Team ${teamNumber + Constants.TEAMS_PER_ALLIANCE * (allianceNumber - 1)} Number`}
					buttons={false}
					align="left"
					required={false}
				/>
			);
		}
	}

	return (
		<>
			<Header name="Drive Team Feeder" back="#" />

			<dtf-home>
				<Form<DtfHomeType.All>
					onFinish={(event: DtfHomeType.All) => {
						setDTFSavedForm(event);

						const teamNumbers: (number | undefined)[] = [];

						for(let i = 1; i <= Constants.NUM_ALLIANCES * Constants.TEAMS_PER_ALLIANCE; i++) {
							const number = event[`teamNumber${i}` as keyof DtfHomeType.All] || undefined;
							teamNumbers.push(number as number | undefined);
						}

						window.location.href = "#dtf/" + teamNumbers.join(",");
					}}
					accessor={accessor}
				>
					<div>

						{teamInput}

						<div>
							<NumberInput<FieldType>
								title="Qual Match #"
								name="qualMatch"
								onChange={updateNumbers}
								required = {false}
							/>

							{teamNumberInput}

							<div className="inputRow">
								<Select<FieldType>
									title="Elims Alliance 1"
									name="elimsAlliance1"
									message="Select the Elims Alliance 1"
									options={allianceTeamOptions}
									onChange={updateAlliance1}
									required={false}
								/>

								<Select<FieldType>
									title="Elims Alliance 2"
									name="elimsAlliance2"
									message="Select the Elims Alliance 2"
									options={allianceTeamOptions}
									onChange={updateAlliance2}
									required={false}
								/>
							</div>
						</div>

						<footer>
							<div className="input_rows">
								<button type="button" onMouseDown={() => { accessor.resetFields(); localStorage.removeItem("dtfSavedForm"); }} className="tabButton">Clear</button>
								<button type="submit" className="tabButton">Submit</button>
							</div>
						</footer>

					</div>
				</Form>
			</dtf-home>
		</>
	);
}
export default DTFHome;

import '../public/stylesheets/dtfHome.css';
import Header from '../parts/header';
import { useEffect } from 'react';
import { getFieldAccessor} from '../parts/formItems';
import { isInPlayoffs, getTeamsInMatch, getAllianceTags, getOpposingAllianceColor, parseRobotPosition, getRobotPositionOptions, teamsPlayingToTeamsList } from '../utils/tbaRequest.ts';
import Constants from '../utils/constants';
import {useState} from 'react';
import type { All, Props, } from '../types/dtfHome';
import Form, { NumberInput, Select, Checkbox, Input, TextArea } from '../parts/formItems';
import type * as DtfHomeType from '../types/dtfHome';
import type * as TbaApi from '../types/tbaApi';
import type { ResultTypes,  } from '../types/tbaRequest';
import { useLocalStorage, } from 'react-use';
import { UpdateModeEnum } from 'chart.js';
import type * as LocalStorage from '../types/localStorage';
import {teamKeysToNumbers} from '../utils/tbaRequest.ts';
function DTFHome(props: Props): React.ReactElement {
	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	type FieldType = DtfHomeType.All
	const accessor = getFieldAccessor<All>();
	function fromEliminationAllianceNumbers(): ResultTypes.TeamsInMatch | null {
			const playoffAlliances = localStorage.getItem("tbaPlayoffAlliances");
			if(playoffAlliances === null) {
				return null;
			}
			const data = JSON.parse(playoffAlliances) as LocalStorage.PlayoffAlliances | null;
	
			if(!data || !data[eventKey]) {
				return null;
			}
			console.log(data);
	
			const result = {
				//eslint-disable-next-line @typescript-eslint/no-magic-numbers
				blue: teamKeysToNumbers(data[eventKey][Number(accessor.getFieldValue('elimsAlliance1'))].picks.slice(0,3)),
				//eslint-disable-next-line @typescript-eslint/no-magic-numbers
				red: teamKeysToNumbers(data[eventKey][Number(accessor.getFieldValue('elimsAlliance2'))].picks.slice(0,3)),
			}
	
			return result;
		}
    const allianceTeamOptions : {label: string, value: TbaApi.ElimsAlliance} []= [
		{label :"Alliance 1", value: "0"  },
		{label: "Alliance 2", value: "1"},
		{label :"Alliance 3", value: "2" },
		{label: "Alliance 4", value: "3"},
		{label :"Alliance 5", value: "4" },
		{label: "Alliance 6", value: "5"},
		{label :"Alliance 7", value: "6" },
		{label: "Alliance 8", value: "7"}
	];
	const [teamsInMatch, setTeamsInMatch] = useState<ResultTypes.TeamsInMatch | null>(null);
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;

	///function that auto-fill the fields in team 1-3
	async function AllianceUpdateBlue(){
		let TempListBlue = fromEliminationAllianceNumbers();
		let BlueList = TempListBlue.blue;
			for (let n = 0; n < 3; n++){
			accessor.setFieldValue(`teamNumber${n+1}` as keyof DtfHomeType.All, BlueList[n])
			}
	}

	async function AllianceUpdateRed(){
		let TempListRed = fromEliminationAllianceNumbers();
		let RedList = TempListRed.red;
			for (let i = 0; i < 3; i++){
			accessor.setFieldValue(`teamNumber${i+4}` as keyof DtfHomeType.All, RedList[i])
			}
	}

	

		


	async function updateTeamNumber(): Promise<void> {
		try {
			const matchNumber = accessor.getFieldValue('qualMatch');

			const teamsInMatch1 = await getTeamsInMatch(eventKey, "qm", accessor.getFieldValue('qualMatch')+1, 0, 0);
			if(!teamsInMatch1) {
				console.log (eventKey, "qm", accessor.getFieldValue('qualMatch'), 0, 0);
				console.error("Failed to get teams playing: teams is empty");
				return;
			}

			setTeamsInMatch(teamsInMatch1);

			
		

			
		} catch (err) {
			console.error("Failed to request TBA data when updating team number", err);
		}
	}
	


	async function updateNumbers(): Promise<void> {
		
		await updateTeamNumber();
		if(!teamsInMatch) {
			return;
		}

		const teamsList = teamsPlayingToTeamsList(teamsInMatch);

		for(let i = 0; i < Constants.TEAMS_PER_ALLIANCE * Constants.NUM_ALLIANCES; i++) {
			accessor.setFieldValue(`teamNumber${i + 1}` as keyof DtfHomeType.All, teamsList[i])
		}
	}


	const teamInput: React.ReactElement[] = [];

	for(let allianceNumber = 1; allianceNumber <= Constants.NUM_ALLIANCES; allianceNumber++) {
		const allianceId = `alliance${allianceNumber}`;
		const teamNumberInput = [];

		for(let teamNumber = 1; teamNumber <= Constants.TEAMS_PER_ALLIANCE; teamNumber++) {
			const teamNumberId: keyof All = `teamNumber${teamNumber + Constants.TEAMS_PER_ALLIANCE * (allianceNumber - 1)}` as keyof All;

			teamNumberInput.push(
				<NumberInput<All>
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
			<Header name={"Drive Team Feeder"} back={"#"} />

			<dtf-home>
				
				<Form<All>
					onFinish={(event: All) => {
						const teamNumbers: (number | undefined)[] = [];

						for(let i = 1; i <= Constants.NUM_ALLIANCES * Constants.TEAMS_PER_ALLIANCE; i++) {
							const number = event[`teamNumber${i}` as keyof All] || undefined;
							teamNumbers.push(number);
						}

						window.location.href = "#dtf/" + teamNumbers.join(",");
					}}
					accessor={accessor}
				>
					<div>
					
					
					{teamInput}
					<div>
					<NumberInput<FieldType>
						title={"Qual Match #"}
						name={"qualMatch"}
						message={"Enter the Qual Match Number"}
						onChange={updateNumbers}
					/>

					<NumberInput<FieldType>
						title={"Team 1 Number"}
						name={"teamNumber1"}
						message={"Enter the Team 1 Number"}
						
					/>

					<NumberInput<FieldType>
						title={"Team 2 Number"}
						name={"teamNumber2"}
						message={"Enter the Team 2 Number"}
						
					/>

					<NumberInput<FieldType>
						title={"Team 3 Number"}
						name={"teamNumber3"}
						message={"Enter the Team 3 Number"}
						
					/>

					<NumberInput<FieldType>
						title={"Team 4 Number"}
						name={"teamNumber4"}
						message={"Enter the Team 4 Number"}
						
					/>

					<NumberInput<FieldType>
						title={"Team 5 Number"}
						name={"teamNumber5"}
						message={"Enter the Team 5 Number"}
						
					/>

					<NumberInput<FieldType>
						title={"Team 6 Number"}
						name={"teamNumber6"}
						message={"Enter the Team 6 Number"}
						
					/>
				<div className="inputRow">
					<Select<FieldType>
						title={"Elims Alliance 1"}
						name={"elimsAlliance1"}
						message={"Select the Elims Alliance 1"}
						options = {allianceTeamOptions}
					    onChange={AllianceUpdateBlue}
						/>

					<Select<FieldType>
						title={"Elims Alliance 2"}
						name={"elimsAlliance2"}
						message={"Select the Elims Alliance 2"}
						options = {allianceTeamOptions}
						onChange={AllianceUpdateRed}
						/>
				</div>





				</div>
					<footer>
					<div className = "input_rows">
		  			<button type="button" onMouseDown={() => {accessor.resetFields()}} className = "tabButton" >Clear</button>
					<button type="button" className="tabButton"  >Submit</button>
				 	</div>
					</footer>
					
					</div>
				</Form>
			</dtf-home>
		</>
	);
}
export default DTFHome;

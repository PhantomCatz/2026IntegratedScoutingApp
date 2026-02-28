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
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);
	const [teamsInMatch, setTeamsInMatch] = useState<ResultTypes.TeamsInMatch | null>(null);
	

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;
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
			
			if (!accessor.getFieldValue('elimsAlliance1') && !accessor.getFieldValue('elimsAlliance2')) {
				return null;
			}
			// else if (!accessor.getFieldValue('elimsAlliance2')) {
			// 	return null;
			// }
			const result = {
				//eslint-disable-next-line @typescript-eslint/no-magic-numbers
				blue: teamKeysToNumbers(data[eventKey][Number(accessor.getFieldValue('elimsAlliance1'))].picks.slice(0,3)),
				//eslint-disable-next-line @typescript-eslint/no-magic-numbers
				red: teamKeysToNumbers(data[eventKey][Number(accessor.getFieldValue('elimsAlliance2'))].picks.slice(0,3)),
			}
	
			return result;
		}
    const allianceTeamOptions : {label: string, value: DtfHomeType.ElimsAlliance} []= [
		{label :"", value: ""},
		{label :"Alliance 1", value: "0"  },
		{label: "Alliance 2", value: "1"},
		{label :"Alliance 3", value: "2" },
		{label: "Alliance 4", value: "3"},
		{label :"Alliance 5", value: "4" },
		{label: "Alliance 6", value: "5"},
		{label :"Alliance 7", value: "6" },
		{label: "Alliance 8", value: "7"}
	];
	

	///function that auto-fill the fields in team 1-3
	function AllianceUpdateBlue(): void {
		
		
		if (accessor.getFieldValue('elimsAlliance1') === "")
		{

			for (let k = 0; k < 3; k++) {
			 	accessor.setFieldValue(`teamNumber${k+1}` as keyof DtfHomeType.All, 0)
			}
		}
		else {
			const TempListBlue = fromEliminationAllianceNumbers();
			if (!TempListBlue) {
				return ;
			}
			const BlueList = TempListBlue.blue;
			
			for (let n = 0; n < 3; n++){
			accessor.setFieldValue(`teamNumber${n+1}` as keyof DtfHomeType.All, BlueList[n])
			}
		}
		
	}


	function AllianceUpdateRed(): void {
		if (accessor.getFieldValue('elimsAlliance2') === "")
		{
			for (let l = 0; l < 3; l++) {
			 	accessor.setFieldValue(`teamNumber${l+4}` as keyof DtfHomeType.All, 0)
			}
		}
		else {
		
		const TempListRed = fromEliminationAllianceNumbers();
		if (!TempListRed){
			return ;
		}
		const RedList = TempListRed.red;
			for (let i = 0; i < 3; i++){
			accessor.setFieldValue(`teamNumber${i+4}` as keyof DtfHomeType.All, RedList[i])
			}
		}
	}

	

		


	// async function updateTeamNumber(): Promise<void> {
		
	// }
	


	async function updateNumbers(): Promise<void> {
		
		const matchNumber = accessor.getFieldValue('qualMatch');
		
		const teamsInMatch1 = await getTeamsInMatch(eventKey, "qm", matchNumber, 0, 0);
		
		
		const teamsList = teamsPlayingToTeamsList(teamsInMatch1);

		console.log (teamsList);
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
						title={"Qual Match #"}
						name={"qualMatch"}
						message={"Enter the Qual Match Number"}
						onChange={updateNumbers}
					/>

					<NumberInput<FieldType>
						title={"Team 1 Number"}
						name={"teamNumber1"}
						message={"Enter the Team 1 Number"}
						buttons={false}
					/>

					<NumberInput<FieldType>
						title={"Team 2 Number"}
						name={"teamNumber2"}
						message={"Enter the Team 2 Number"}
						buttons={false}
					/>

					<NumberInput<FieldType>
						title={"Team 3 Number"}
						name={"teamNumber3"}
						message={"Enter the Team 3 Number"}
						buttons={false}
					/>

					<NumberInput<FieldType>
						title={"Team 4 Number"}
						name={"teamNumber4"}
						message={"Enter the Team 4 Number"}
						buttons={false}
					/>

					<NumberInput<FieldType>
						title={"Team 5 Number"}
						name={"teamNumber5"}
						message={"Enter the Team 5 Number"}
						buttons={false}
					/>

					<NumberInput<FieldType>
						title={"Team 6 Number"}
						name={"teamNumber6"}
						message={"Enter the Team 6 Number"}
						buttons={false}
					/>
				<div className="inputRow">
					<Select<FieldType>
						title={"Elims Alliance 1"}
						name={"elimsAlliance1"}
						message={"Select the Elims Alliance 1"}
						options = {allianceTeamOptions}
					    onChange={AllianceUpdateBlue}
						required = {false}
						/>

					<Select<FieldType>
						title={"Elims Alliance 2"}
						name={"elimsAlliance2"}
						message={"Select the Elims Alliance 2"}
						options = {allianceTeamOptions}
						onChange={AllianceUpdateRed}
						required = {false}
						/>
				</div>





				</div>
					<footer>
					<div className = "input_rows">
		  			<button type="button" onMouseDown={() => {accessor.resetFields()}} className = "tabButton" >Clear</button>
					<button type="submit" className="tabButton"  >Submit</button>
				 	</div>
					</footer>
					
					</div>
				</Form>
			</dtf-home>
		</>
	);
}
export default DTFHome;

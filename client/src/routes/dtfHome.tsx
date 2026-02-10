import '../public/stylesheets/dtfHome.css';
import Header from '../parts/header';
import { useEffect } from 'react';
import Form, { NumberInput, } from '../parts/formItems';
import { getFieldAccessor} from '../parts/formItems';
import Constants from '../utils/constants';
import {useState} from 'react';
import type { All, Props, } from '../types/dtfHome';

function DTFHome(props: Props): React.ReactElement {
	useEffect(() => {
		document.title = props.title;
	}, [props.title]);

	const accessor = getFieldAccessor<All>();
    
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

		teamInput.push(
			<div key={allianceId}>
				<h2>Alliance {allianceNumber}</h2>
				<hr/>
				{teamNumberInput}
			</div>
		);
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
					
					<div className="container">
					<label htmlFor="team1">Qual 1 Number</label>
					<input type="number" id="team1" className="rounded-box"></input>
					</div>
					{teamInput}
					<div className = "inputRow">
                      <div className="input input__select"  > 

						<label  className="text-align: left;">Elims Alliance 1</label> 
						<select id="comp_level" name="comp_level" > 
					 	<option value="1">Alliance 1</option> 
						<option value="2">Alliance 2</option> 
						<option value="3">Alliance 3</option> 
						<option value="4">Alliance 4</option> 
						<option value="5">Alliance 5</option> 
						<option value="6">Alliance 6</option> 
						<option value="7">Alliance 7</option> 
						<option value="8">Alliance 8</option> 
						 </select>
						
						</div>
						
					  <div className="input input__select" > 

						<label  className="text-align: left;">Elims Alliance 2</label> 
						<select id="comp_level" name="comp_level" > 
					 	<option value="1">Alliance 1</option> 
						<option value="2">Alliance 2</option> 
						<option value="3">Alliance 3</option> 
						<option value="4">Alliance 4</option> 
						<option value="5">Alliance 5</option> 
						<option value="6">Alliance 6</option>
						<option value="7">Alliance 7</option>
						<option value="8">Alliance 8</option>
						</select> 

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

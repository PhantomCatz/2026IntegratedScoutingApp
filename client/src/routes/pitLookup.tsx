import '../public/stylesheets/pitLookup.css';
import { useEffect, useState } from 'react';
import { useLocalStorage, } from 'react-use';
import Header from '../parts/header';
import { getAllTeams, } from '../utils/tbaRequest.ts';
import PitTabs from '../parts/pitTabs';
import { NumberInput } from '../parts/formItems';
import {getFieldAccessor } from '../parts/formItems';
import { Tabs, } from '../parts/tabs';
import Constants from '../utils/constants';

import type * as TbaApi from '../types/tbaApi';
import type { TabItem, TabItems } from '../parts/tabs';
import type * as Database from '../types/database';
import type * as PitLookupTypes from '../types/pitLookup';

type Props = {
	title: string;
};

function PitLookup(props: Props): React.ReactElement {
	const [isLoading, setIsLoading] = useState(false);
	const [refresh, setRefresh] = useState(false);
	const [teamNumberElements, setTeamNumberElements] = useState<React.ReactElement[] | null>(null);
	const [teamNumber, setTeamNumber] = useState(0);
	const [tabNumber, setTabNumber] = useState("1");
	const [tabItems, setTabItems] = useState([initialTab()]);
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;

	const accessor = getFieldAccessor<PitLookupTypes.All>();

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	useEffect(() => {
		void (async function() {
			setIsLoading(true);
			try {
				const data = await getAllTeams(eventKey);

				if(!data) {
					throw new Error("Could not get data");
				}

				const teamNumbers = data.map(function (team) {
					return (<h2 key={team}>
						<a
							onClick={() => {setTeamNumber(team)}}
							style={{
								cursor: "pointer"
							}}
						>{team}</a>
					</h2>);
				});

				setTeamNumberElements(teamNumbers);
			} catch (err) {
				console.error("Error fetching team list: ", err);
			}
			setIsLoading(false);
		})();
	}, [eventKey]);
	useEffect(() => {
		const res: TabItems = [initialTab()].concat(tabItems.slice(1));

		setTabItems(res);
	}, [teamNumberElements]);
	useEffect(() => {
		void (async () => {
			if(!teamNumber) {
				return;
			}

			let fetchLink = Constants.SERVER_ADDRESS;

			if(!fetchLink) {
				console.error("Could not get fetch link; check .env");
				return;
			}
			fetchLink += "reqType=getTeamPitData";

			const res1 = await fetch(fetchLink + `&team=${teamNumber}`);
			const pitData = await res1.json() as Database.PitDataEntry[];

			fetchLink = Constants.SERVER_ADDRESS;
			fetchLink += "reqType=getTeamPitPictureData";

			const res2 = await fetch(fetchLink + `&team=${teamNumber}`);
			const pitPictureData = await res2.json() as Database.PitPictureEntry[];

			const pitPictureMap: { [id: number]: Database.PitPictureEntry | undefined } = {};

			for(const pitPictureEntry of pitPictureData) {
				pitPictureMap[pitPictureEntry.id] = pitPictureEntry;
			}

			const data: Database.PitDataFullEntry[] = pitData.map(pitDataEntry => {
				const pitDataFullEntry: Database.PitDataFullEntry = {
					...pitDataEntry,
					robot_image_uri: pitPictureMap[pitDataEntry.id]?.robot_image_uri ?? "",
				};

				return pitDataFullEntry;
			});

			createTabs(teamNumber, data);
		})();
	}, [teamNumber]);

	function initialTab(): TabItem {
		return {
			key: '1',
			label: 'Team',
			children: Lookup(),
		};
	}
	function Lookup(): React.ReactElement {
		if(!isLoading && !teamNumberElements) {
			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			setTimeout(() => {setRefresh(!refresh);}, 1000);
		}
		return (
			<>
				<NumberInput
					name="team_number"
					title="Team Number"
					min={0}
					max={99999}
				/>
				<button className={"submitButton"} onClick={function(_) {
					const team_number = accessor.getFieldValue("team_number");
					setTeamNumber(team_number);
					// createTabs(team_number, null);
				}}>Submit</button>
				<h2>List of Teams</h2>
				{teamNumberElements}
			</>
		);
	}

	function createTabs(teamNumber: number, data: Database.PitDataEntry[] | null): void {
		console.log(`teamNumber=`, teamNumber);
		try {
			const tabs = PitTabs({teamNumber: teamNumber, data: data});

			setTabItems([initialTab(), ...tabs]);
		} catch (err) {
			console.error(err);
		}
	}

	return (
		<>
			<Header name={"Pit Lookup"} back={"#scoutingapp/lookup"} />

			<pit-lookup>
				<Tabs defaultActiveKey="1" activeKey={tabNumber} items={tabItems} onChange={setTabNumber} />
			</pit-lookup>
		</>
	);
};

export default PitLookup;

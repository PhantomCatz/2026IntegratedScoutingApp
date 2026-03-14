import '../public/stylesheets/matchValidation.css';
import '../public/stylesheets/style.css';
import { useEffect, useState } from 'react';
import { useLocalStorage, } from 'react-use';
import Header from '../parts/header';
import { getMatchId, request, parseRobotPosition } from '../utils/tbaRequest.ts';
import { assertNonNull } from '../types/assertions';
import Constants from '../utils/constants';

import type * as TbaApi from '../types/tbaApi';
import type * as TbaRequest from '../types/tbaRequest';
import type * as Database from '../types/database.ts';

type Props = {
	title: string;
};

type AllianceZoneData = { [key: TbaApi.MatchKey]: Partial<{
		[allianceColor in TbaApi.AllianceColor]:
			Database.AllianceZoneEntry
	}> | undefined
};
type MatchData = { [key: TbaApi.MatchKey]: Partial<{
		[allianceColor in TbaApi.AllianceColor]: Partial<{
			[robotPosition in TbaRequest.RobotPosition]: Database.MatchEntry
		}>
	}> | undefined
};
type TbaData = { [key: TbaApi.MatchKey]: TbaApi.Match | undefined };

function MatchValidation(props: Props): React.ReactElement {
	const [allianceZoneData, setAllianceZoneData] = useState<AllianceZoneData | null>(null);
	const [matchData, setMatchData] = useState<MatchData | null>(null);
	const [tbaData, setTbaData] = useState<TbaData | null>(null);
	const [invalidMatches, setInvalidMatches] = useState<React.ReactElement[] | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>('eventKey', Constants.EVENT_KEY);

	if(!_eventKey) {
		throw new Error("Could not get event key");
	}

	const eventKey = _eventKey;

	useEffect(() => {
		document.title = props.title;
	}, [props.title]);
	useEffect(() => {
		const fetchLink = Constants.SERVER_ADDRESS;

		if(!fetchLink) {
			console.error("Could not get fetch link; check .env");
			return;
		}
		setIsLoading(true);

		void Promise.all([(async () => {
				const allianceZoneFetchLink = fetchLink + "reqType=getAllianceZoneData";

				try {
					const res = await fetch(allianceZoneFetchLink + `&eventKey=${eventKey}`);
					const data = await res.json() as Database.AllianceZoneEntry[] | null;

					if(!data) {
						throw new Error("Could not get alliance zone data.");
					}

					const allianceZoneData: AllianceZoneData = {};

					for(const allianceZoneEntry of data) {
						const id = getMatchId(allianceZoneEntry.event_key, allianceZoneEntry.comp_level, allianceZoneEntry.match_number);
						if(!allianceZoneData[id]) {
							allianceZoneData[id] = {};
						}

						allianceZoneData[id][allianceZoneEntry.robot_alliance] = allianceZoneEntry;
					}

					setAllianceZoneData(allianceZoneData);
				} catch (err) {
					window.alert(`An error occurred: ${err}`);
				}
			})(),
			(async () => {
				const matchDataFetchLink = fetchLink + "reqType=getAllMatchData";

				try {
					const res = await fetch(matchDataFetchLink + `&eventKey=${eventKey}`);
					const data = await res.json() as Database.MatchEntry[] | null;

					if(!data) {
						throw new Error("Could not get match data.");
					}

					const matchData: MatchData = {};

					for(const match of data) {
						const id = getMatchId(match.event_key, match.comp_level, match.match_number);
						const allianceColor = parseRobotPosition(match.robot_position)[0];

						matchData[id] ??= {};
						matchData[id][allianceColor] ??= {};

						matchData[id][allianceColor][match.robot_position] = match;
					}

					setMatchData(matchData);
				} catch (err) {
					window.alert(`An error occurred: ${err}`);
				}
			})(),
			(async () => {
				try {
					const res = await request(`event/${eventKey}/matches`);
					const data = await res.json() as TbaApi.Match[];

					const tbaData: TbaData = {};

					data.forEach(match => {
						tbaData[match.key] = match;
					});

					setTbaData(tbaData);
				} catch (err) {
					window.alert(`An error occurred: ${err}`);
				}
			})(),
		])
			.catch((err: unknown) => {
				console.log(err);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);
	useEffect(() => {
		setInvalidMatches(getInvalidMatches());
	}, [allianceZoneData, matchData, tbaData]);

	function getInvalidMatches(): React.ReactElement[] | null {
		if(!allianceZoneData || !matchData || !tbaData) {
			return null;
		}

		if(isLoading) {
			return null;
		}

		setIsLoading(true);

		const invalidMatches: { [matchId: TbaApi.MatchKey]: { [alliance in TbaApi.AllianceColor]?: {
			autoMismatch?: boolean,
			teleopMismatch?: boolean,
			orderingMismatch?: boolean,
			sameTierMismatch?: boolean,
			needsToScout?: boolean,
		}}} = {};

		for(const [_id, allianceZoneEntry] of Object.entries(allianceZoneData)) {
			const id = _id as TbaApi.MatchKey;
			assertNonNull(allianceZoneEntry);

			const match = matchData[id];
			const tbaMatchData: TbaApi.Match | undefined = tbaData[id];

			if(!match) {
				continue;
			}
			if(!tbaMatchData) {
				console.error("Did not have tba data for alliance zone scouted match");
				continue;
			}
			assertNonNull(tbaMatchData);

			for(const _allianceColor in allianceZoneEntry) {
				const allianceColor = _allianceColor as TbaApi.AllianceColor;

				const allianceMatches = match[allianceColor];

				if(!allianceMatches || Object.keys(allianceMatches).length < Constants.TEAMS_PER_ALLIANCE) {
					invalidMatches[id] ??= {};
					invalidMatches[id][allianceColor] ??= {};

					invalidMatches[id][allianceColor].needsToScout = true;
					continue;
				}

				let databaseTotalAutonCount = 0;
				let databaseTotalTeleopCount = 0;

				for(const match of Object.values(allianceMatches)) {
					databaseTotalAutonCount += match.auton_fuel_scored;
					databaseTotalTeleopCount += match.teleop_fuel_scored;
				}

				const tbaTotalAutonCount = tbaMatchData.score_breakdown[allianceColor].hubScore.autoCount;
				const tbaTotalTeleopCount = tbaMatchData.score_breakdown[allianceColor].hubScore.teleopCount;

				const RATIO_THRESHOLD = 0.8;
				const ABSOLUTE_THRESHOLD = 5;

				if((databaseTotalAutonCount < RATIO_THRESHOLD * tbaTotalAutonCount
					|| tbaTotalAutonCount < RATIO_THRESHOLD * databaseTotalAutonCount)
					&& Math.abs(databaseTotalAutonCount - tbaTotalAutonCount) > ABSOLUTE_THRESHOLD) {
					invalidMatches[id] ??= {};
					invalidMatches[id][allianceColor] ??= {};

					invalidMatches[id][allianceColor].autoMismatch = true;
				}
				if((databaseTotalTeleopCount < RATIO_THRESHOLD * tbaTotalTeleopCount
					|| tbaTotalTeleopCount < RATIO_THRESHOLD * databaseTotalTeleopCount)
					&& Math.abs(databaseTotalTeleopCount - tbaTotalTeleopCount) > ABSOLUTE_THRESHOLD) {
					invalidMatches[id] ??= {};
					invalidMatches[id][allianceColor] ??= {};

					invalidMatches[id][allianceColor].teleopMismatch = true;
				}
			}
		}

		const invalidItems: React.ReactElement[] = [];
		for(const [_matchId, matchInfo] of Object.entries(invalidMatches)) {
			const matchId = _matchId as TbaApi.MatchKey;
			for(const [_allianceColor, options] of Object.entries(matchInfo)) {
				const allianceColor = _allianceColor as TbaApi.AllianceColor;
				console.log(matchId, allianceColor);

				const tbaMatchLink = "https://www.thebluealliance.com/match/";

				if(options.needsToScout) {
					invalidItems.push(<invalid-match key={`${matchId}|${allianceColor}`}>
						<p>
							Match id: <a href={tbaMatchLink + matchId} target="_blank" rel="noreferrer">{matchId}</a>
							<br/>
							Alliance color: {allianceColor}
							<br/>
							<br/>
							No data found for this alliance
						</p>
					</invalid-match>
					);
					continue;
				}

				assertNonNull(matchData[matchId]);
				assertNonNull(matchData[matchId][allianceColor]);
				const match = matchData[matchId][allianceColor];
				const entries = Object.values(match);

				assertNonNull(tbaData[matchId]);
				const tbaMatch = tbaData[matchId].score_breakdown[allianceColor];

				invalidItems.push(<invalid-match key={`${matchId}|${allianceColor}`}>
					Match id: <a href={tbaMatchLink + matchId} target="_blank" rel="noreferrer">{matchId}</a>
					<br/>
					Alliance color: {allianceColor}

					{options.autoMismatch &&
						<invalid-item className="invalid-item__auton-mismatch">
							Calculated Auton Score: {entries.map(m => m.auton_fuel_scored).reduce((a, b) => a+ b).toString()}
							<br/>
							TBA Auton Score: {tbaMatch.hubScore.autoCount}
							<br/>
							<br/>
							{entries.map(m => `${m.team_number}: ${m.auton_fuel_scored}`).join(", ")}
						</invalid-item>
					}
					{options.teleopMismatch &&
						<invalid-item className="invalid-item__teleop-mismatch">
							Calculated Teleop Score: {entries.map(m => m.teleop_fuel_scored).reduce((a, b) => a+ b).toString()}
							<br/>
							TBA Teleop Score: {tbaMatch.hubScore.teleopCount}
							<br/>
							<br/>
							{entries.map(m => `${m.team_number}: ${m.teleop_fuel_scored}`).join(", ")}
						</invalid-item>
					}
				</invalid-match>
				);
			}
		}

		setIsLoading(false);

		return invalidItems;
	}

	return (
		<>
			<Header name={"Match Validation"} back="#" />

			<match-validation>
				<h2 style={{ display: isLoading ? 'inherit' : 'none' }}>Loading data...</h2>
				{ invalidMatches ?
					invalidMatches
					:
					<h1>No Data QAQ</h1>
				}
			</match-validation>
		</>
	);
}

export default MatchValidation;

import "dotenv/config";
import { requestDatabase, submitData } from "./database.ts";
import express from "express";
import type { TableName } from "./types/database.ts";

const API_BASE_URL = "/api/";
const API_GET_ENDPOINTS: {
	[endpointUrl: string]: string | [string, string[]];
} = {
	":event_key/allianceZone/all": [
		`SELECT * FROM match_data WHERE event_key=?;`,
		["event_key"],
	],
	":event_key/match/all": [
		`SELECT * FROM match_data WHERE event_key=?;`,
		["event_key"],
	],
	":event_key/match/team/:team_number": [
		`SELECT * FROM match_data WHERE event_key=? AND team_number=?;`,
		["event_key", "team_number"],
	],
	":event_key/pit/team/:team_number": [
		`SELECT pit_data.*, pit_picture_data.robot_image_uri
FROM pit_data
LEFT JOIN pit_picture_data ON pit_data.id = pit_picture_data.id
WHERE pit_data.event_key=? AND pit_data.team_number=?;`,
		["event_key", "team_number"],
	],
	":event_key/pit/team/data/:team_number": [
		`SELECT * FROM pit_data WHERE event_key=? AND team_number=?;`,
		["event_key", "team_number"],
	],
	":event_key/pit/team/pictures/:team_number": [
		`SELECT * FROM pit_pictures_data WHERE event_key=? AND team_number=?;`,
		["event_key", "team_number"],
	],
	":event_key/pit/teamsScouted": [
		`SELECT unique team_number FROM pit_data WHERE event_key=?;`,
		["event_key"],
	],
	":event_key/strategic/all": [
		`SELECT * FROM strategic_data WHERE event_key=?;`,
		["event_key"],
	],
	":event_key/strategic/team/:team_number": [
		`SELECT * FROM strategic_data WHERE event_key=? AND team_number=?;`,
		["event_key", "team_number"],
	],
};
// TODO: figure out typing so that server can easily match client (tRPC?)
const API_POST_ENDPOINTS: {
	[endpointUrl: string]: TableName | ((data: unknown) => Promise<unknown>);
} = {
	"allianceZone/match/": "alliance_zone_data",
	"match/team/": "match_data",
	"pit/team/full/": async function (data: unknown) {
		const pitPictureData = {
			event_key: data.event_key,
			team_number: data.team_number,
			scouter_initials: data.scouter_initials,
			robot_image_uri: data.robot_image_uri,
		};
		delete data.robot_image_uri;

		const res = await submitData(data, "pit_data");

		pitPictureData.id = res.insertId;

		return await submitData(pitPictureData, "pit_picture_data");
	},
	"pit/team/data/": "pit_data",
	"pit/team/pictures/": "pit_picture_data",
	"strategic/team/": "strategic_data",
};

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const PORT = process.env.SERVER_PORT || 3001;

const app = express();

app.use(
	express.json({
		limit: "16mb",
	}),
);

app.use((_request, response, next) => {
	//TODO: should this be removed?
	response.header("Access-Control-Allow-Origin", "*");
	response.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept",
	);
	next();
});

app.listen(PORT, () => {
	console.info(`Server listening on ${PORT}`);
});

for (const [endpoint, items] of Object.entries(API_GET_ENDPOINTS)) {
	const endpointUrl = API_BASE_URL + endpoint;
	console.info(`Lisenting to GET at: ${endpointUrl}`);

	const [query, substitutions] =
		typeof items === "string" ? [items, []] : [items[0], items[1]];

	app.get(endpointUrl, async function (request, response) {
		let result = null;

		const substitutionValues = substitutions.map(
			(parameter) => request.params[parameter],
		);

		console.info(
			`GET ${endpointUrl} with ${substitutions.map((parameter) => `${parameter}=${request.params[parameter]}`).join(", ")}`,
		);

		try {
			result = await requestDatabase(query, {
				substitution: substitutionValues,
			});
		} catch (err) {
			console.error(`ERROR: `, err);
		}

		response.json(result);
	});
}

for (const [endpoint, items] of Object.entries(API_POST_ENDPOINTS)) {
	const endpointUrl = API_BASE_URL + endpoint;
	console.info(`Lisenting to POST at: ${endpointUrl}`);

	app.post(endpointUrl, async function (request, response) {
		let result;

		const data = request.body as unknown;

		try {
			if (typeof items === "string") {
				if (!(typeof data === "object")) {
					// eslint-disable-next-line @typescript-eslint/no-magic-numbers
					response.status(400);
					return response;
				}

				result = await submitData(data as object, items);
			} else {
				result = await items(data);
			}
		} catch (err) {
			console.error(`ERROR: `, err);

			// eslint-disable-next-line @typescript-eslint/no-magic-numbers
			response.status(500);
			return response;
		}

		response.json(result);
		return response;
	});
}

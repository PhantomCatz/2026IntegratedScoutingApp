import { requestDatabase } from "./database.ts";

type PickRankingUpdateBody = {
	event_key: string;
	team_number: number;
	first_pick_ranking?: number;
	second_pick_ranking?: number;
};

function isPickRankingUpdateBody(data: unknown): data is PickRankingUpdateBody {
	if (!data || typeof data !== "object") {
		return false;
	}
	const body = data as Partial<PickRankingUpdateBody>;
	return typeof body.event_key === "string" && typeof body.team_number === "number";
}

export async function updatePickRanking(data: unknown): Promise<unknown> {
	if (!isPickRankingUpdateBody(data)) {
		throw new Error("Invalid pick ranking body");
	}

	const hasFirst = typeof data.first_pick_ranking === "number";
	const hasSecond = typeof data.second_pick_ranking === "number";
	if (!hasFirst && !hasSecond) {
		throw new Error("Provide first_pick_ranking and/or second_pick_ranking");
	}

	const first = hasFirst ? data.first_pick_ranking : 0;
	const second = hasSecond ? data.second_pick_ranking : 0;

	const updates: string[] = [];
	if (hasFirst) {
		updates.push("first_pick_ranking = VALUES(first_pick_ranking)");
	}
	if (hasSecond) {
		updates.push("second_pick_ranking = VALUES(second_pick_ranking)");
	}

	return requestDatabase(
		`INSERT INTO picklist_rankings (event_key, team_number, first_pick_ranking, second_pick_ranking)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
		{
			substitution: [data.event_key, data.team_number, first, second],
		},
	);
}

const WEIGHT_FIELDS = [
	"auton_fuel_scored_w",
	"auton_climb_successful_w",
	"teleop_fuel_scored_w",
	"teleop_fuel_hoarded_w",
	"endgame_climb_successful_w",
	"overall_robot_died_w",
	"overall_defended_others_w",
	"robot_appeared_w",
] as const;

type PickWeightsUpdateBody = {
	event_key: string;
	robot_position: number;
} & Partial<Record<(typeof WEIGHT_FIELDS)[number], number>>;

function isPickWeightsUpdateBody(data: unknown): data is PickWeightsUpdateBody {
	if (!data || typeof data !== "object") {
		return false;
	}
	const body = data as Partial<PickWeightsUpdateBody>;
	return (
		typeof body.event_key === "string" &&
		typeof body.robot_position === "number" &&
		(body.robot_position === 1 || body.robot_position === 2)
	);
}

export async function updatePickWeights(data: unknown): Promise<unknown> {
	if (!isPickWeightsUpdateBody(data)) {
		throw new Error("Invalid pick weights body");
	}

	const values = WEIGHT_FIELDS.map((field) =>
		typeof data[field] === "number" ? data[field] : 0,
	);
	const updateClauses = WEIGHT_FIELDS.map((field) => `${field} = VALUES(${field})`);

	return requestDatabase(
		`INSERT INTO picklist_weights (
			event_key, robot_position, ${WEIGHT_FIELDS.join(", ")}
		) VALUES (?, ?, ${WEIGHT_FIELDS.map(() => "?").join(", ")})
		ON DUPLICATE KEY UPDATE ${updateClauses.join(", ")}`,
		{
			substitution: [data.event_key, data.robot_position, ...values],
		},
	);
}
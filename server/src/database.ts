import mysql from "mysql2/promise";

import type { TableName } from "./types/database.ts";

const defaultValue = { err: "Failed to resolve request." };
const _connectionData = {
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	database: process.env.DB_DATABASE,
	connectionLimit: 15,
};

if (!process.env.DB_DATABASE || !_connectionData.database) {
	console.error("connectionData=", _connectionData);
	console.error("[91mWARNING:[0m Check .env");
	throw new Error("oiaresntioaresnt");
}

const connectionData = _connectionData as {
	[key in keyof typeof _connectionData]: NonNullable<
		(typeof _connectionData)[key]
	>;
};

console.log(`Using Database ${process.env.DB_DATABASE}`);

// this is so sus
let connPool = {
	errorConnection: {
		query: function (sqlQuery: string) {
			console.error(`Did not run query '${sqlQuery}'`);
			return { ...defaultValue };
		},
		release: function () {},
	} as unknown as mysql.PoolConnection,
	getConnection: async function () {
		try {
			const pool = mysql.createPool(connectionData);

			const conn = await pool.getConnection();

			connPool = pool as never;

			return conn;
		} catch (err) {
			console.error("Error in creating connection pool:", err);

			// :eyes: :eyes: :eyes:
			return connPool.errorConnection as never satisfies mysql.PoolConnection;
		}
	},
};

type RequestConfig = {
	substitution: unknown[];
};

async function requestDatabase(
	query: string,
	config: RequestConfig,
): Promise<unknown> {
	let result = null;

	const sqlQuery = query;

	try {
		const conn = await connPool.getConnection();

		result = [];

		const [res, fields] = await conn.query(sqlQuery, config.substitution);

		result = res;

		conn.release();
	} catch (err) {
		console.error("Failed to resolve request:");
		console.log(`err=`, err);
		console.log(`sqlQuery=`, sqlQuery);
		console.log(`config=`, config);
		// console.log(err);
	}
	return result;
}

async function submitData(
	data: object,
	table: TableName,
): Promise<mysql.QueryResult | null> {
	const keys = Object.keys(data);
	const sqlQuery = `INSERT INTO ${table} (${keys.join(",")}) values(${keys.map(() => "?").join(",")})`;
	const values = Object.values(data);

	let result = null;

	try {
		const conn = await connPool.getConnection();

		const [queryResult, _fields] = await conn.query(sqlQuery, values);

		result = queryResult;

		conn.release();
	} catch (err) {
		console.error(`Failed to resolve request to ${table}:`);
		console.dir(err);
	}

	return result;
}

export { requestDatabase, submitData };

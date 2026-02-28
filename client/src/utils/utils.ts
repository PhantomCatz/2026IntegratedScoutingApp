import * as Assertions from '../types/assertions';
/* eslint-disable @typescript-eslint/no-magic-numbers */

function round(num: number, prec : number = 3): number {
	return Math.round(num * 10 ** prec) / 10 ** prec;
}
async function sleep(ms: number): Promise<void> {
	await new Promise(resolve => { setTimeout(resolve, ms); });
}
function readImage(blob: Blob): Promise<string> {
	return new Promise(function(resolve, reject) {
		const reader = new FileReader();
		reader.readAsDataURL(blob);
		reader.onload = () => {
			const base64Image: string = reader.result as string;

			resolve(base64Image);
		};
		reader.onerror = () => {
			reject(new Error("Could not read image"));
		}
	});
}
function splitString(str: string, size: number): string[] {
	const numChunks = Math.ceil(str.length / size);
	const chunks: string[] = new Array(numChunks) as string[];

	for (let i = 0, o = 0; i < numChunks; i++, o += size) {
		chunks[i] = str.substring(o, size);
	}

	return chunks;
}
function getRandomHex(): string {
	const vals = "0123456789ABCDEF";
	const randVal = Math.floor(Math.random() * vals.length);

	return vals[randVal];
}
function parseHexColor(color: string): [number, number, number] {
	return [Number.parseInt(color.substring(0, 2), 16), Number.parseInt(color.substring(2, 4), 16), Number.parseInt(color.substring(4, 6), 16)];
}
function escapeUnicode(str: string): string {
	// eslint-disable-next-line @typescript-eslint/no-misused-spread
	return [...str]
		.map(
			c => /^[\x00-\x7F]$/.test(c) ?
				c :
				c
					.split("")
					.map(a =>
						"\\u" + a
							.charCodeAt(0)
							.toString(16)
							.padStart(4, "0")
					).join("")
		)
		.join("");
}
function ord(char: string): number {
	return char.charCodeAt(0);
}
function toNumber(x: unknown): number {
	const num = Number(x || 0) || 0;
	return num;
}
function toTinyInt(x: unknown): 0 | 1 {
	return x ? 1 : 0;
}
function toPercentageString(num: number): string {
	num = toNumber(num);

	return `${round(num * 100, 2)}%`;
}
function maximumOfMap(map: Map<string, number>, ordering?: { [key: string]: number | undefined }): string {
	Assertions.assertTruthy(map.size);
	let maxValue = -Infinity;
	for(const value of map.values()) {
		if(value > maxValue) {
			maxValue = value;
		}
	}

	const maxKeys = map.entries()
		.filter(item => item[1] === maxValue)
		.map(item => item[0])
		.toArray();

	if(ordering) {
		maxKeys.sort((a, b) => {
			const o1 = ordering[a];
			const o2 = ordering[b];

			Assertions.assertNumber(o1);
			Assertions.assertNumber(o2);

			return o1 - o2;
		});
	}

	return maxKeys[0];
}

export {
	round,
	sleep,
	readImage,
	splitString,
	getRandomHex,
	parseHexColor,
	escapeUnicode,
	ord,
	toNumber,
	toTinyInt,
	toPercentageString,
	maximumOfMap,
};

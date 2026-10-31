import { isValidElement } from "react";
import "../public/stylesheets/table.css";

type SortDirection = "asc" | "desc";

type Props = {
	data: { [key: string]: React.ReactNode }[];
	columns: {
		[columnGroupTitle: string]: {
			[columnTitle: string]: string;
		};
	};
	getKey: (row: { [key: string]: React.ReactNode }) => string;
	fixedFields?: { [key: string]: true | undefined };
	sortKey?: string | null;
	sortDirection?: SortDirection;
	onSort?: (columnKey: string) => void;
	/** Columns where a lower number is a better rank (e.g. TBA / pick ranking). */
	rankingSortKeys?: string[];
};

function cellToSortable(value: React.ReactNode): string | number {
	if (value === null || value === undefined || value === "") {
		return "";
	}
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed.endsWith("%")) {
			const percent = Number(trimmed.slice(0, -1));
			if (!Number.isNaN(percent)) {
				return percent;
			}
		}
		const asNumber = Number(trimmed);
		if (trimmed !== "" && !Number.isNaN(asNumber)) {
			return asNumber;
		}
		return trimmed;
	}
	if (isValidElement(value)) {
		const elementProps = value.props as { value?: number; children?: React.ReactNode };
		if (typeof elementProps.value === "number") {
			return elementProps.value;
		}
		if (elementProps.children != null) {
			return cellToSortable(elementProps.children);
		}
	}
	return String(value);
}

function compareCellValues(a: React.ReactNode, b: React.ReactNode, ranking = false): number {
	let aValue = cellToSortable(a);
	let bValue = cellToSortable(b);
	// Unranked pick slots use 0; treat like missing so they sink to the bottom.
	if (ranking) {
		if (aValue === 0) {
			aValue = "";
		}
		if (bValue === 0) {
			bValue = "";
		}
	}
	const aEmpty = aValue === "";
	const bEmpty = bValue === "";
	if (aEmpty && bEmpty) {
		return 0;
	}
	if (aEmpty) {
		return 1;
	}
	if (bEmpty) {
		return -1;
	}
	if (typeof aValue === "number" && typeof bValue === "number") {
		return aValue - bValue;
	}
	return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
}

function Table(props: Props): React.ReactElement {
	const columns = props.columns;
	const data = props.data;
	const sortKey = props.sortKey ?? null;
	const sortDirection = props.sortDirection ?? "asc";
	const onSort = props.onSort;
	const rankingSortKeys = new Set(props.rankingSortKeys ?? []);

	const sortedData =
		sortKey === null
			? data
			: [...data].sort((rowA, rowB) => {
					const isRanking = rankingSortKeys.has(sortKey);
					const result = compareCellValues(rowA[sortKey], rowB[sortKey], isRanking);
					// Ranking columns: lower number = higher rank, so reverse asc/desc vs normal numbers.
					if (isRanking) {
						return sortDirection === "asc" ? -result : result;
					}
					return sortDirection === "asc" ? result : -result;
				});

	const columnGroups = Object.entries(columns).map((item) => {
		const [title, group] = item;
		return <col key={title} span={Object.keys(group).length} />;
	});
	const columnGroupTitles = Object.entries(columns).map((item) => {
		const [title, group] = item;
		return (
			<th key={title} scope="colgroup" colSpan={Object.keys(group).length}>
				{title}
			</th>
		);
	});
	const columnTitles = Object.entries(columns).flatMap((groupItem) => {
		const [_groupTitle, group] = groupItem;
		return Object.entries(group).map((item) => {
			const [columnName, columnKey] = item;
			const isActive = sortKey === columnKey;
			return (
				<th
					key={columnKey}
					scope="col"
					className={onSort ? "table__sortable" : undefined}
					onClick={onSort ? () => onSort(columnKey) : undefined}
				>
					{columnName}
					{isActive && (sortDirection === "asc" ? " ▼" : " ▲")}
				</th>
			);
		});
	});
	const dataBody = sortedData.map((dataRow) =>
		Object.entries(columns)
			.map((groupItem) => groupItem[1])
			.flatMap((groupItem) => {
				return Object.entries(groupItem)
					.map((item) => item[1])
					.map((key) => dataRow[key]);
			}),
	);
	const dataElements = dataBody.map((row, rowNumber) => {
		const dataRow = sortedData[rowNumber];
		let rowKey = `${rowNumber}`;
		try {
			const key = props.getKey(dataRow);
			if (key != null && key !== "") {
				rowKey = key;
			}
		} catch {
			// Callers may omit id/key fields; fall back to row index.
		}

		return (
			<tr key={rowKey}>
				{row.map((item, columnNumber) => (
					<td key={`${rowKey}|${columnNumber}`}>{item}</td>
				))}
			</tr>
		);
	});

	return (
		<table className="table">
			<colgroup>{columnGroups}</colgroup>
			<thead>
				<tr>{columnGroupTitles}</tr>
				<tr>{columnTitles}</tr>
			</thead>
			<tbody>{dataElements}</tbody>
		</table>
	);
}

export default Table;

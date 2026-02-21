import '../public/stylesheets/table.css';

type Props = {
	data: { [key: string]: React.ReactNode }[],
	columns: { [columnGroupTitle: string]: {
		[columnTitle: string]: string,
	}},
	getKey: (row: { [key: string]: React.ReactNode }) => string,
	fixedFields?: { [key: string]: true | undefined },
};

function Table(props: Props): React.ReactElement {
	const columns = props.columns;
	const data = props.data;
	const fixedFields = props.fixedFields ?? {};

	const columnGroups = Object.entries(columns).map(item => {
		const [title, group] = item;
		return <col key={title} span={Object.keys(group).length} />
	});
	const columnGroupTitles = Object.entries(columns).map(item => {
		const [title, group] = item;
		return <th key={title} scope="colgroup" colSpan={Object.keys(group).length}>{title}</th>
	});
	const columnTitles = Object.entries(columns).flatMap(groupItem => {
		const [_groupTitle, group] = groupItem;
		return Object.entries(group).map((item) => {
			const [columnName, columnKey] = item;
			return <th key={columnKey} scope="col">{columnName}</th>;
		});
	});
	const dataBody = data.map(dataRow =>
		Object.entries(columns).map(groupItem => groupItem[1]).flatMap(
			groupItem => {
				return Object.entries(groupItem).map(item => item[1]).map(
					key => dataRow[key]);
			}));
	const dataElements = dataBody.map((row, rowNumber) =>
		<tr key={`${rowNumber}`}>
			{
				row.map((item, columnNumber) =>
				<td key={`${rowNumber}|${columnNumber}`}>
					{item}
				</td>
				)
			}
		</tr>
	);


	return (
		<table className="table">
			<colgroup>
				{ columnGroups }
			</colgroup>
			<thead>
				<tr>
					{ columnGroupTitles }
				</tr>
				<tr>
					{ columnTitles }
				</tr>
			</thead>
			<tbody>
				{dataElements}
			</tbody>
		</table>
	);
}

export default Table;

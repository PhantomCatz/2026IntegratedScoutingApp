import "../public/stylesheets/pitLookup.css";
import { useEffect, useState } from "react";
import { useLocalStorage } from "react-use";
import Header from "../parts/header";
import { getAllTeams } from "../utils/tbaRequest.ts";
import PitTabs from "../parts/pitTabs";
import { NumberInput } from "../parts/formItems";
import { getFieldAccessor } from "../parts/formItems";
import { Tabs } from "../parts/tabs";
import Constants from "../utils/constants";

import type * as TbaApi from "../types/tbaApi";
import type { TabItem, TabItems } from "../parts/tabs";
import type * as Database from "../types/database";

function Picklist(): React.ReactElement {
    const [sortState, setSortState] = useState<SortState>(null);
    const [tabNumber, setTabNumber] = useState("1");
    const [_eventKey, _setEventKey] = useLocalStorage<TbaApi.EventKey>("eventKey", Constants.EVENT_KEY);
    const tabItems: TabItems = [
		{
			key: "1",
			label: "First Pick",
			children: firstPick(),
		},
		{
			key: "2",
			label: "Second Pick",
			children: secondPick(),
		},
		{
			key: "3",
			label: "Data Dump",
			children: dataDump(),
		},
		{
			key: "4",
			label: "Comments",
			children: comments(),
		},
		{
			key: "5",
			label: "Weights",
			children: weights(),
		}
	];

    if (!_eventKey) {
		throw new Error("Could not get event key");
	}

    type SortKey = keyof PicklistRow | "pickRank";
    type SortDirection = "asc" | "desc";
    type SortState = { key: SortKey; direction: SortDirection } | null;
    type PickRank = { [teamNumber: string]: number | "" };
    type Column = {
	key: SortKey;
	label: string;
	sortable: boolean;
    };

    function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
        if (a == null && b == null) {
            return 0;
        }
        if (a == null) {
            return 1;
        }
        if (b == null) {
            return -1;
        }
        if (typeof a === "number" && typeof b === "number") {
            return a - b;
        }
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    }

    function firstPick(): React.ReactElement {
        type PicklistRow = {
            teamNumber: number;
            tbaRanking: number | null;
            autonAvg: number | null;
            teleopAvg: number | null;
            iegr: number | null;
            sotm: string;
            restriction: string;
            drivetrain: string;
            deathRate: number | null;
        };

        const COLUMNS: Column[] = [
            { key: "teamNumber", label: "Team #", sortable: true },
            { key: "tbaRanking", label: "TBA ranking", sortable: true },
            { key: "pickRanking", label: "Pick ranking", sortable: true },
            { key: "autonAvg", label: "Auton avg", sortable: true },
            { key: "teleopAvg", label: "Teleop avg", sortable: true },
            { key: "iegr", label: "IEGR", sortable: true },
            { key: "sotm", label: "SOTM", sortable: true },
            { key: "restriction", label: "Restriction", sortable: true },
            { key: "drivetrain", label: "Drivetrain", sortable: true },
            { key: "deathRate", label: "Death rate", sortable: true },
        ];
        
        return(
            <>
            <table>
                <thead>
                    {COLUMNS.map((column) => (
                        <th key={column.key.toString()} onClick={() => setSortState({ key: column.key, direction: sortState?.key === column.key && sortState.direction === "asc" ? "desc" : "asc" })}>
                            {column.label}
                            {sortState?.key === column.key && (sortState.direction === "asc" ? " ▲" : " ▼")}
                        </th>
                    ))}
                </thead>
            </table>
            </>
        );
    }
    function secondPick(): React.ReactElement {
        type PicklistRow = {
            teamNumber: number;
            iegr: number | null;
            hoard: string;
            defense: string;
            restriction: string;
            deathRate: number | null;
            motorType: string;
            drivetrain: string;
        };

        const COLUMNS: Column[] = [
            { key: "teamNumber", label: "Team #", sortable: true },
            { key: "pickRanking", label: "Pick ranking", sortable: true },
            { key: "iegr", label: "IEGR", sortable: true },
            { key: "hoard", label: "Hoard", sortable: true },
            { key: "defense", label: "Defense", sortable: true },
            { key: "restriction", label: "Restriction", sortable: true },
            { key: "deathRate", label: "Death rate", sortable: true },
            { key: "motorType", label: "Motor Type", sortable: true },
            { key: "drivetrain", label: "Drivetrain", sortable: true },
        ];
        
        return(
            <>
            <table>
                <thead>
                    {COLUMNS.map((column) => (
                        <th key={column.key.toString()} onClick={() => setSortState({ key: column.key, direction: sortState?.key === column.key && sortState.direction === "asc" ? "desc" : "asc" })}>
                            {column.label}
                            {sortState?.key === column.key && (sortState.direction === "asc" ? " ▲" : " ▼")}
                        </th>
                    ))}
                </thead>
            </table>
            </>
        );
    }
    function dataDump(): React.ReactElement {}
    function comments(): React.ReactElement {}
    function weights(): React.ReactElement {}

    return (
        <>
        <Header name={"Picklist"} back={"#"} />
        <picklist>
            <Tabs defaultActiveKey="1" activeKey={tabNumber} items={tabItems} onChange={setTabNumber} />
        </picklist>
        </>
    );
}

export default Picklist;
import ReactDOM from "react-dom/client";
import HomeRouter from "./routes/homeRouter";
import ScoutingAppRouter from "./routes/scoutingAppRouter";
import MatchScout from "./routes/matchScout";
import DTFHome from "./routes/dtfHome";
import DTFTeams from "./routes/dtfTeams";
import StrategicScout from "./routes/strategicScout";
import DataLookup from "./routes/dataLookup";
import PitScout from "./routes/pitScout";
import SettingsPage from "./routes/settingsPage";
import AllianceZone from "./routes/allianceZone";
import MatchValidation from "./routes/matchValidation";
import { HashRouter, Navigate, Routes, Route } from "react-router-dom";

const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);

// Debounce alerting for less annoyance
window.alert = (function () {
	const alert = window.alert;
	let id: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let lastMessage: any[] = [];
	const DEBOUNCE_WINDOW = 500;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (message: any) {
		clearTimeout(id);

		if (!lastMessage.includes(message)) {
			lastMessage.push(message);
		}

		id = setTimeout(function () {
			if (!lastMessage.length) {
				return;
			}

			alert(lastMessage.join("\n"));
			lastMessage = [];
		}, DEBOUNCE_WINDOW);
	};
})();

function App(): React.ReactElement {
	// TODO: refactor titles
	// TODO: add single header object for all pages
	return (
		<HashRouter>
			<Routes>
				<Route path="/" element={<HomeRouter title="2637 Strategy App" />} />
				<Route path="/scoutingapp" element={<ScoutingAppRouter title="2637 Scouting App" />} />
				<Route path="/scoutingapp/match" element={<MatchScout title="2637 Match Scout" />} />
				<Route path="/scoutingapp/strategic" element={<StrategicScout title="2637 Strategic Scout" />} />
				<Route path="/scoutingapp/lookup" element={<DataLookup title="2637 Data Lookup" />} />
				<Route path="/scoutingapp/lookup/" element={<DataLookup title="2637 Data Lookup" />} />
				<Route path="/scoutingapp/lookup/strategic" element={<Navigate to="/scoutingapp/lookup" replace />} />
				<Route path="/scoutingapp/lookup/match" element={<Navigate to="/scoutingapp/lookup" replace />} />
				<Route path="/scoutingapp/lookup/pit" element={<Navigate to="/scoutingapp/lookup" replace />} />
				<Route path="/scoutingapp/lookup/teamdata/:teamNumber" element={<Navigate to="/scoutingapp/lookup" replace />} />
				<Route path="/scoutingapp/lookup/teamData/:teamNumber" element={<Navigate to="/scoutingapp/lookup" replace />} />
				<Route path="/scoutingapp/pit" element={<PitScout title="2637 Pit Scout" />} />
				<Route path="/scoutingapp/alliance" element={<AllianceZone title="2637 Alliance Zone" />} />
				<Route path="/dtf" element={<DTFHome title="2637 Drive Team Feeder" />} />
				<Route path="/dtf/:teamParams" element={<DTFTeams title="2637 Drive Team Feeder" />} />
				<Route path="/settings" element={<SettingsPage title="Settings" />} />
				<Route path="/validation" element={<MatchValidation title="Data Validation" />} />
			</Routes>
		</HashRouter>
	);
}

root.render(<App />);

window.addEventListener("error", (event) => {
	window.alert(event.message);
});

window.addEventListener("unhandledrejection", (event) => {
	window.alert(event);
});
